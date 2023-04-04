
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
        this.protoDoc = JSON.parse(JSON.stringify(protoDoc)); //Clone the ProtoDocument
    }

    getTopLevelMessageNames(){
        let messageNames = [];
        
        for(let messageName in this.protoDoc.root.nested){
            if(this.protoDoc.root.nested[messageName].syntaxType === "MessageDefinition"){
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
            for(let fieldName in this.protoDoc.root.nested[messageName].fields){
                fields.push(this.protoDoc.root.nested[messageName].fields[fieldName]);
            }
            return fields;
        }
        throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
    }

    getMaximumFieldId(messageName){
        if(this.hasMessageDefinition(messageName)){
            return this._getMaximumFieldId(this.protoDoc.root.nested[messageName]);
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

    addField(messageName, fieldName, fieldType, options = {}){
        if(!this.hasMessageDefinition(messageName)){
            throw new Error("Message Name not found in Top Level Messages: Found " + messageName);
        }
        let fieldNode;
        if(BASE_TYPES[fieldType]){
            fieldNode = {
                "name": fieldName,
                "fullName": "." + messageName + "." + fieldName,
                "comment": options.comment || null,
                "type": {
                  "value": fieldType,
                  "syntaxType": "BaseType"
                },
                "id": this.getMaximumFieldId(messageName) + 1,
                "required": options.required || false,
                "optional": options.optional === undefined ? true : !options.required,
                "repeated": options.repeated || false,
                "map": false
              };

        } else if(mapRegex.test(fieldType)){
            let [_,keyType, valueType] = mapRegex.exec(fieldType);
            fieldNode = {
                "name": fieldName,
                "fullName": "." + messageName + "." + fieldName,
                "comment": options.comment || null,
                "type": {
                  "value": valueType,
                  "syntaxType": BASE_TYPES[valueType] ?  "BaseType" : "Identifier"
                },
                "id": this.getMaximumFieldId(messageName) + 1,
                "required": options.required || false,
                "optional": options.optional === undefined ? true : !options.required,
                "repeated": options.repeated || false,
                "map": true,
                "keyType": {
                    "value": keyType,
                    "syntaxType": BASE_TYPES[keyType] ?  "BaseType" : "Identifier"
                  }
              };
        }else {
            fieldNode = {
                "name": fieldName,
                "fullName": "." + messageName + "." + fieldName,
                "comment": options.comment || null,
                "type": {
                  "value": fieldType,
                  "syntaxType": "Identifier",
                  "resolvedValue": "." + fieldType
                },
                "id": this.getMaximumFieldId(messageName) + 1,
                "required": options.required || false,
                "optional": options.optional === undefined ? true : !options.required,
                "repeated": options.repeated || false,
                "map": false
              };
        }

        let messageNode = this.protoDoc.root.nested[messageName];
        if(messageNode[fieldName]){
            throw new Error(`Field "${fieldName}" already exists in "${messageName}"`)
        }

        messageNode.fields[fieldName] = fieldNode;

        return fieldNode;
    }

    extractProtoDocument(){
        //Clones the document
        return JSON.parse(JSON.stringify(this.protoDoc));
    }
}

module.exports = {
    ProtoDocumentEditor
}