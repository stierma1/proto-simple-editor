const { assert } = require('chai'); 
const fs = require("fs");
const path = require("path");
const compiler = require("proto-ast-compile");
const parser = require("proto-parser");
const compile = compiler.compile;
const {ProtoDocumentEditor} = require("../../index");
 
const protoDocument = JSON.parse(fs.readFileSync(path.join(__dirname, "../resources", "example1.json"), "utf-8"));

let document = compile(protoDocument);
let parseDocument = parser.parse(document);

describe("ProtoDocument", function(){
    const protoDocument1 = JSON.parse(fs.readFileSync(path.join(__dirname, "../resources", "example1.json"), "utf-8"));
    const protoDocument2 = JSON.parse(fs.readFileSync(path.join(__dirname, "../resources", "example2.json"), "utf-8"));
    
    describe("Add Message", function(){
        it("Should add Message", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            editor.addMessage("TestMessage")
            assert.equal(0, editor.getMaximumFieldId("TestMessage"));
            editor.addField("TestMessage", "test_field", "int64");
            assert.equal(1, editor.getMaximumFieldId("TestMessage"));
        });
    });

    describe("Package Messages", function(){
        it("Should set Package", function(){
            let editor = new ProtoDocumentEditor(protoDocument);
            assert.equal("", editor.topLevelNode.name);
            editor.setPackage("test.test2.test3");
            assert.equal("test3", editor.topLevelNode.name);

            editor = new ProtoDocumentEditor(protoDocument2);
            assert.equal("package", editor.topLevelNode.name);
            editor.setPackage("test.test2.test3");
            assert.equal("test3", editor.topLevelNode.name);
        });
    });
    
    describe("Message Methods", function(){
        it("Should get maximum id", function(){
            let editor = new ProtoDocumentEditor(protoDocument1);
            assert.equal(5, editor.getMaximumFieldId("IntroduceYourselfReply"));
            assert.equal(2, editor.getMaximumFieldId("Skill"));
        });

        it("Should get maximum id", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            assert.equal(5, editor.getMaximumFieldId("outer"));
        });
        
        it("Should get fields", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            let fields = editor.getMessageTopLevelFields("outer");
            assert.equal(fields.length, 3);
        });

        it("Should add field and update id", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            editor.addField("outer", "test_field", "int64");
            assert.equal(6, editor.getMaximumFieldId("outer"));
            let matchedField = editor.getMessageTopLevelFields("outer").filter(({name}) => {return name === "test_field"});
            assert.equal(1, matchedField.length);
            assert.equal(6, matchedField[0].id);
            assert.equal("BaseType", matchedField[0].type.syntaxType);
        });

        it("Should add fields with options", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            editor.addField("outer", "test_field", "int64", {repeated:true, required:true, comment:"test comment"});
            assert.equal(6, editor.getMaximumFieldId("outer"));
            let matchedField = editor.getMessageTopLevelFields("outer").filter(({name}) => {return name === "test_field"});
            assert.equal(1, matchedField.length);
            assert.equal(true, matchedField[0].required);
            assert.equal(true, matchedField[0].repeated);
            assert.equal("test comment", matchedField[0].comment);
        });

        it("Should add identifier field", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            editor.addField("outer", "test_field", "Inner");
            let matchedField = editor.getMessageTopLevelFields("outer").filter(({name}) => {return name === "test_field"});
            assert.equal(1, matchedField.length);
            assert.equal("Identifier", matchedField[0].type.syntaxType);
        });

        it("Should add map field", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            editor.addField("outer", "test_field", "map<int64, Inner>");
            let matchedField = editor.getMessageTopLevelFields("outer").filter(({name}) => {return name === "test_field"});
            assert.equal(1, matchedField.length);
            assert.equal(true, matchedField[0].map);
            assert.equal("Identifier", matchedField[0].type.syntaxType);
            assert.equal("BaseType", matchedField[0].keyType.syntaxType);
        });

        it("Should create valid ProtoDocuments", function(){
            let editor = new ProtoDocumentEditor(protoDocument2);
            editor.addField("outer", "test_map_field", "map<int64, inner>");
            editor.addField("outer", "test_identifier_field", "inner");
            editor.addField("outer", "test_field", "int64");
            editor.addMessage("TestMessage");
            editor.addOption("test", 1)
            editor.setPackage("bigger.better.namespace");
            editor.setPackage("bigger.better.namespace");
            
            let proto = editor.extractProtoDocument();
            let reParsed = parser.parse(compile(proto));
            let editorRecompiled = new ProtoDocumentEditor(reParsed);

            assert.equal(8, editorRecompiled.getMaximumFieldId("outer"));
        });
    });


});