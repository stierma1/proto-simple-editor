
let BASE_TYPES = {
    int32:true,
    int64:true,
    uint32:true,
    uint64: true,
    bool:true,
    sint32:true,
    sint64:true,
    string:true,
    bytes:true,
    fixed32:true,
    sfixed32:true,
    fixed64:true,
    sfixed64:true,
    float:true,
    double:true
};

const mapRegex = /^map\<([^, ]+),\s*([^, ]+)\>/;

class ProtoDocumentEditor{
    constructor(protoDoc){
        if(protoDoc){
            this.protoDoc = JSON.parse(JSON.stringify(protoDoc)); //Clone the ProtoDocument
        } else {
            this.createEmptyDocument();
        }
        this.namespace = null;
        this.topLevelNode = null;
        this._setNamespace();
    }

    createEmptyDocument(){
        let documentNode = {
            "syntax": "proto3",
            "root": {
              "name": "",
              "fullName": "",
              "syntaxType": "ProtoRoot",
              "nested": {}
            },
            "syntaxType": "ProtoDocument"
        }

        this.protoDoc = documentNode;
        this._setNamespace();
        return this;
    }

    _setNamespace(){
        let root = this.protoDoc.root;
        for(let r in root.nested){
            if(root.nested[r].syntaxType === "NamespaceDefinition"){
                this.namespace = this._getNamespace(root.nested[r]);
                return;
            }
        }
        this.topLevelNode = root;
    }

    _getNamespace(node){
        if(node.syntaxType === "NamespaceDefinition"){
            let childNamespace = null;
            for(let nestNode in node.nested){
                if(node.nested[nestNode].syntaxType === "NamespaceDefinition"){
                    childNamespace = this._getNamespace(node.nested[nestNode]);
                }
            }
            if(childNamespace){
                return node.name + "." + childNamespace;
            } else {
                this.topLevelNode = node;
                return node.name;
            }
            
        }

        this.topLevelNode = node;
        return null;
    }

    getTopLevelMessageNames(){
        let messageNames = [];
        for(let messageName in this.topLevelNode.nested){
            if(this.topLevelNode.nested[messageName].syntaxType === "MessageDefinition"){
                messageNames.push(messageName);
            }
        }

        return messageNames;
    }

    hasMessageDefinition(messageName){
        return this.getTopLevelMessageNames().indexOf(messageName) > -1;
    }

    getMessageTopLevelFields(messageName){
        if(this.hasMessageDefinition(messageName)){
            let fields = [];
            for(let fieldName in this.topLevelNode.nested[messageName].fields){
                fields.push(this.topLevelNode.nested[messageName].fields[fieldName]);
            }
            return fields;
        }
        throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
    }

    getMaximumFieldId(messageName){
        if(this.hasMessageDefinition(messageName)){
            return this._getMaximumFieldId(this.topLevelNode.nested[messageName]);
        }
        throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
    }

    _getMaximumFieldId(node){
        let maximum = 0;
        for(let messageFieldName in node.fields){
            if(node.fields[messageFieldName].id > maximum){
                maximum = node.fields[messageFieldName].id;
            }
        }
        for(let subMessageName in node.nested){
            if(node.nested[subMessageName].syntaxType === "MessageDefinition"){
                let subMax = this._getMaximumFieldId(node.nested[subMessageName]);
                maximum = subMax > maximum ? subMax : maximum;
            }
        }

        return maximum;
    }

    addField(messageName, fieldName, fieldType, features = {}){
        if(!this.hasMessageDefinition(messageName)){
            throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
        }
        let fieldNode;
        let namespacePrefix = this.namespace ? "." + this.namespace : ".";
        if(BASE_TYPES[fieldType]){
            fieldNode = {
                "name": fieldName,
                "fullName": namespacePrefix + messageName + "." + fieldName,
                "options": features.options,
                "comment": features.comment || null,
                "type": {
                  "value": fieldType,
                  "syntaxType": "BaseType"
                },
                "id": this.getMaximumFieldId(messageName) + 1,
                "required": features.required || false,
                "optional": features.optional === undefined ? true : !features.required,
                "repeated": features.repeated || false,
                "map": false
              };

        } else if(mapRegex.test(fieldType)){
            let [_,keyType, valueType] = mapRegex.exec(fieldType);
            fieldNode = {
                "name": fieldName,
                "fullName": namespacePrefix + messageName + "." + fieldName,
                "options": features.options,
                "comment": features.comment || null,
                "type": {
                  "value": valueType,
                  "syntaxType": BASE_TYPES[valueType] ?  "BaseType" : "Identifier"
                },
                "id": this.getMaximumFieldId(messageName) + 1,
                "required": features.required || false,
                "optional": features.optional === undefined ? true : !features.required,
                "repeated": features.repeated || false,
                "map": true,
                "keyType": {
                    "value": keyType,
                    "syntaxType": BASE_TYPES[keyType] ?  "BaseType" : "Identifier"
                  }
              };
        }else {
            fieldNode = {
                "name": fieldName,
                "fullName": namespacePrefix + messageName + "." + fieldName,
                "options": features.options,
                "comment": features.comment || null,
                "type": {
                  "value": fieldType,
                  "syntaxType": "Identifier",
                  "resolvedValue": "." + fieldType
                },
                "id": this.getMaximumFieldId(messageName) + 1,
                "required": features.required || false,
                "optional": features.optional === undefined ? true : !features.required,
                "repeated": features.repeated || false,
                "map": false
              };
        }

        let messageNode = this.topLevelNode.nested[messageName];
        if(messageNode[fieldName]){
            throw new Error(`Field "${fieldName}" already exists in "${messageName}"`)
        }

        messageNode.fields[fieldName] = fieldNode;

        return this;
    }

    getMessageFieldNames(messageName){
        if(!this.hasMessageDefinition(messageName)){
            throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
        }
        let fields = [];
        for(let fieldName in this.topLevelNode.nested[messageName].fields){
            fields.push(fieldName);
        }

        return fields;
    }

    isFieldInMessage(messageName, fieldName){
        return this.getMessageFieldNames(messageName).indexOf(fieldName) > -1;
    }

    getOptionsFromField(messageName, fieldName){
        if(!this.isFieldInMessage(messageName, fieldName)){
            throw new Error("Message: " + messageName + " does not contain field: " + fieldName);
        }
        let options = {};
        let fieldOptions = this.topLevelNode.nested[messageName].fields[fieldName].options || {};
        for(let key in fieldOptions){
            options[key] = fieldOptions[key];
        }
        return options;
    }

    addOptionToField(messageName, fieldName, key, value){
        if(!this.isFieldInMessage(messageName, fieldName)){
            throw new Error("Message: " + messageName + " does not contain field: " + fieldName);
        }
        let options = this.topLevelNode.nested[messageName].fields[fieldName].options || {};
        options[key] = value;
        this.topLevelNode.nested[messageName].fields[fieldName].options = options;
        return this;
    }

    setPackage(namespace){
        let namespaceSegments = namespace.split(".");
        let topLevelNode = {
            "options": this.getOptionsFromDoc(),
            "name": namespaceSegments[namespaceSegments.length - 1],
            "fullName": "." + namespaceSegments.join("."),
            "syntaxType": "NamespaceDefinition",
            "nested": this.topLevelNode.nested
        };
        let currentNode = topLevelNode;
        for(let i = namespaceSegments.length - 1; i-- ; i >= 0){
            let parentSegments = namespaceSegments.slice(0, i + 1);
            let parentNode = {
                "name": parentSegments[i],
                "fullName": "." + parentSegments.join("."),
                "syntaxType": "NamespaceDefinition",
                "nested": {
                }
            };
            parentNode.nested[currentNode.name] = currentNode;
            currentNode = parentNode;
        }
        this.protoDoc.root.nested = {};
        this.protoDoc.root.nested[currentNode.name] = currentNode;
        this.topLevelNode = topLevelNode;
        this.namespace = namespaceSegments.join(".");
        return this;
    }

    getPackage(){
        return this.namespace;
    }

    clearPackage(){
        this.protoDoc.root.nested = this.topLevelNode.nested;
        this.topLevelNode = this.protoDoc.root;
        return this;
    }

    addImport(importStr){
        let imports = this.protoDoc.imports || [];
        imports.push(importStr);
        this.protoDoc.imports = imports;
        return this;
    }

    getImports(){
        return (this.protoDoc.imports || []).concat([]);
    }

    addOptionToMessage(messageName, key, value){
        if(!this.hasMessageDefinition(messageName)){
            throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
        }
        let options = this.topLevelNode.nested[messageName].options || {};
        options[key] = value;
        this.topLevelNode.nested[messageName].options = options;
        return this;
    }

    getOptionsFromMessage(messageName){
        if(!this.hasMessageDefinition(messageName)){
            throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
        }
        let options = this.topLevelNode.nested[messageName].options || {};
        let optionCopy = {};
        for(let key in options){
            optionCopy[key] = options[key];
        }

        return optionCopy;
    }

    addOptionToDoc(key, value){
        let options = this.topLevelNode.options || {};
        options[key] = value;
        this.topLevelNode.options = options;
        return this;
    }

    getOptionsFromDoc(){
        let options =  this.topLevelNode.options || {};
        let optionCopy = {};
        for(let key in options){
            optionCopy[key] = options[key];
        }

        return optionCopy;
    }

    addMessage(messageName, features = {}){
        let namespacePrefix = this.namespace ? "." + this.namespace : ".";
        let messageNode = {
            name:messageName,
            fullName: namespacePrefix + messageName,
            comment: features.comment,
            syntaxType: "MessageDefinition",
            options: features.options,
            fields: {

            }
        }
        this.topLevelNode.nested[messageName] = messageNode;
        return this;
    }

    extractProtoDocument(){
        //Clones the document
        return JSON.parse(JSON.stringify(this.protoDoc));
    }
}

module.exports = {
    ProtoDocumentEditor
}