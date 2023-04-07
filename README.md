# proto-simple-editor
Edit an ProtoDocument AST document via code.

### Usage
```js
const {ProtoDocumentEditor} = require("proto-simpe-editor");

//Empty Doc
let editor = new ProtoDocumentEditor();
//Edit a ProtoDocument from "proto-parser"
let editor = new ProtoDocumentEditor(protoDocument);

//Use editor methods

//Extract the updated document
let editedProtoDocument = editor.extractProtoDocument();

```

### ProtoDocumentEditor Methods

* **createEmptyDocument() -> ProtoDocumentEditor (this)**

Clears the existing document.  Returns the editor
* **getTopLevelMessageNames() -> array[string]**

Returns an array of the top level message names
* **hasMessageDefinition(string messageName) -> bool**

Checks for message at the top level of the document
* **addMessage(string messageName, map<string, *> features) -> ProtoDocumentEditor(this)**

Add a message to the top level of the document

map<string, *> features

comment : string defaults to null - comment to add to the message

options : map<string, *> defaults to {} - field options to be set on the message
* **getMessageTopLevelFields(string messageName) -> array[string]**

Returns an array of the fields present in the message

* **getMaximumFieldId(string messageName) -> int**

Returns the largest field Id present in the message.  Recursively checks inner messages to make sure Id's are correct

* **addField(string messageName, string fieldName, string fieldType, map<string, *> features) -> ProtoDocumentEditor (this)**

Adds a field to the message will autopopulate the Id field

map<string, *> features

required : boolean defaults to false - whether the field is required

repeated : boolean defaults to false - whether the field is repeated

comment : string defaults to null - comment to add to the field

options : map<string, *> defaults to {} - field options to be set on the field

* **getMessageFieldNames(string messageName) -> array[string]**

Return array of field names beloning to the message
* **isFieldInMessage(string messageName, string fieldName) -> bool**

Checks whether the field exists within the given messageName

* **getOptionsFromField(string messageName, string fieldName) -> map<string, *>**

Returns the options present on the field
* **addOptionToField(stirng messageName, string fieldName, string key, * val) -> ProtoDocumentEditor (this)**

Adds the option to the field
* **setPackage(string packageName) -> ProtoDocumentEditor (this)**

Adds/Overwrites the package
* **getPackage() -> string**

Returns the package
* **clearPackage() -> ProtoDocumentEditor (this)**

Clears the package
* **getImports() -> array[string]**

Returns the imports on the document
* **addImport(string import) -> ProtoDocumentEditor (this)**

Adds an import
* **addOptionToDoc(string key, * val) -> ProtoDocumentEditor (this)**

Adds an option to the document
* **extractProtoDocument() -> ProtoDocument**

Returns a copy of the edited ProtoDocument