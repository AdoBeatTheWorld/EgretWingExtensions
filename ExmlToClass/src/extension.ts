import * as wing from 'wing';
import * as path from 'path';
import * as fs from 'fs';
import {IStoreSchema,IStoreSchemaMap,IFormOptions,PopupType,Store} from 'wing';
var parser = require('xml-parser');

export function activate() {
	wing.commands.registerCommand('extension.ExmlToClass', doExchange);
}
let schema:IStoreSchemaMap = {
    checkbox:{
        type : "boolean",
        title : "生成getInstance",
        default : true
    },
    checkbox1:{
        type : "boolean",
        title : "生成ChildrenCreated",
        default : true
    },
    checkbox2:{
        type : "boolean",
        title : "生成measure",
        default : true
    },
    checkbox3:{
        type : "boolean",
        title : "生成addToStage&removeFromStage handler",
        default : true
    },
    inputbox:{
        type :'string',
        title : "Class 输出目录",
        default : ""
    }
};
let properties = {
	inputbox: ""
}
var baseClass:string;
var classComponents;
var className:string;
var skinName:string;
var namespaces = {};
function doExchange(){
    let e = wing.window.activeTextEditor;
    if( !e){
        wing.window.showErrorMessage("No File Selected Now");
        return;
    }
    let filename = e.document.fileName;
    let ext = path.extname(filename);
    
    if( ext != ".exml"){
        wing.window.showErrorMessage("File is not exml");
        return;
    }
    
    let content = e.document.getText();
    let xml = parser(content);
    let isEui = is_eui(content);
    baseClass = isEui ? "eui.Panel" : getHostComponent(xml);
    parseNS(xml);
    classComponents = parseSkinConponents(xml,isEui);
    let targetFileName = getTargetName(filename);
    let baseName = path.basename(targetFileName);
    properties = {
	   inputbox: targetFileName
    };
    className = baseName.split(".")[0];
    skinName = parseSkinname(filename);
    wing.window.showPopup<IFormOptions>(PopupType.Form, new Store(properties, schema),{
        title : "输出设置"
    }).then((result)=>{
        let classContent = assemble(className,baseClass,skinName,classComponents,result.getProperties(true));
        fs.writeFileSync(targetFileName,classContent,{encoding:"utf-8"});
    })
    
}

function parseNS(content) {
    var tempArr;
    for(var key in content.root.attributes){
        if( key.indexOf("xmlns:") == 0 && ["xmlns:w","xmlns:e"].indexOf(key) == -1){
            tempArr = key.split(":");
            namespaces[tempArr[1]] = content.root.attributes[key];
        }
    }
}

function parseSkinname(text:string) {
    var index = text.indexOf("\\src\\");
    var result:string;
    if( index != -1){
        result =  text.substr(index+5).split(".")[0];
        while(result.indexOf("\\") != -1){
            result = result.replace("\\",".");
        }
        return result;
    }
    
    var index = text.indexOf("\\resource\\");
    var result:string;
    if( index != -1){
        result =  text.substr(index+1);
        while(result.indexOf("\\") != -1){
            result = result.replace("\\","\/");
        }
    }
    return result;
}
const contructorTemplate = "\tconstructor(){\r\t\tsuper();\r\t\tthis.skinName=\"{skinName}\";\r\t{addHandler}\r\t}"
const variableTemplate = "\tpublic {varName}:{varType};\r";
const partAddedMethodTemplate = "\tpublic partAdded(name:string, instance:any){\r\t\tsuper.partAdded(name, instance);\r{Variables}\r\t}";
const firstPartTemplate = "\t\tif(name == \"{varName}\"){\r\t\t\tthis.{varName}=instance;\r\t\t}";
const normalPartTemplate = "else if(name == \"{varName}\"){\r\t\t\tthis.{varName}=instance;\r\t\t}";
const singletonTemplate = "\r\tprivate static _instance:{className};\r\tpublic static getInstance():{className}{\r\t\tif({className}._instance == null){\r\t\t\t{className}._instance = new {className}();\r\t\t}\r\t\treturn {className}._instance;\r\t}";
const childrenCreatedTemplate = "\r\tpublic childrenCreated(){\r\t\tsuper.childrenCreated();\r\t\t\/\/todo\r\t}\r";
const measureTemplate = "\r\tpublic measure(){\r\t\tsuper.measure();\r\t\t\/\/todo\r\t}\r";
const addHandlerTemplate = "\tthis.addEventListener(egret.Event.ADDED_TO_STAGE,this.onAdded, this );\r\t\tthis.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.onRemoved, this);"
const addStageTemplate = "\r\tprivate onAdded(evt:egret.Event){\r\t\t\/\/todo\r\t}\r\r\tprivate onRemoved(evt:egret.Event){\r\t\t\/\/todo\r\t}\r";
function assemble(className,baseClass,skinName,classComponents,settings) {
    var tempString;
    var classContent = "class "+className+" extends "+baseClass+"{\r";
    //constructor
    classContent += contructorTemplate.replace("{skinName}",skinName);
    if(  settings["checkbox3"] ){
        classContent = classContent.replace("{addHandler}",addHandlerTemplate);
        classContent+=addStageTemplate;
    }else{
        classContent = classContent.replace("{addHandler}","");
    }
    var len = classComponents.length;
    var component;
    var componentName:string;
    var componentType:string;
    var variables:string;
    var partAddContent:string;
    for(var i = 0; i < len; i++){
        component = classComponents[i];
        componentType = component[0];
        componentName = component[1];
        if( i != 0){
            variables += variableTemplate.replace("{varName}",componentName).replace("{varType}",componentType);
            partAddContent += normalPartTemplate.replace("{varName}",componentName).replace("{varName}",componentName);
        }else{
            variables = variableTemplate.replace("{varName}",componentName).replace("{varType}",componentType);
            partAddContent = firstPartTemplate.replace("{varName}",componentName).replace("{varName}",componentName);
        }
    }
    classContent += "\r"+variables;
    classContent += partAddedMethodTemplate.replace("{Variables}",partAddContent);
    if( settings["checkbox1"] ){
        classContent+=childrenCreatedTemplate;
    }
    if( settings["checkbox2"] ){
        classContent+=measureTemplate;
    }
    if( settings["checkbox"] ){
        tempString = singletonTemplate;
        while(tempString.indexOf("{className}")!=-1){
            tempString = tempString.replace("{className}",className);
        }
        classContent+=tempString;
    }
    classContent+="\r}";
    return classContent;
}
let ignoreTypes = ["e:states","w:Declarations","w:HostComponent"];
function parseSkinConponents(content,isEui) {
    var arr = content.root.children;
    var len = arr.length;
    var component;
    
    var typePreFix:string = isEui ? "eui." : "egret.gui.";
    var result = [];
    for(var i = 0; i < len; i++){
        parseComponent(arr[i], result,typePreFix);
    }
    return result;
}

function parseComponent(component, targetArr,typePreFix) {
    if(component.attributes["id"]){
        var componentType:string;
        var componentName = component.name;
        if (ignoreTypes.indexOf(componentName)==-1) {   
            
            //componentType = typePreFix + componentName.split(":")[1];
            componentType = parseComponentType(componentName,typePreFix)
            componentName = component.attributes["id"];
            targetArr.push([componentType, componentName]);
        }
    }
    var arr = component.children;
    var len = arr.length;
    if( len != 0){
        for(var i = 0; i < len; i++){
            parseComponent(arr[i], targetArr,typePreFix);
        }
    }
}

function parseComponentType(componentName:string,defaultTypePreFix:string) : string{
    var tempArr = componentName.split(":");
    if( tempArr.length != 2){
        return componentName;
    }
    if( tempArr[0] == "e"){
        return defaultTypePreFix+tempArr[1];
    }
    if( namespaces[tempArr[0]]){
        return namespaces[tempArr[0]].replace("*",tempArr[1]);
    }
    return componentName;
}

function getHostComponent(content) {
    var arr = content.root.children;
    var len = arr.length;
    var component;
    var componentName:string;
    for(var i = 0; i < len; i++){
        component = arr[i];
        
        componentName = component.name;
        if (componentName =="w:HostComponent") {
            return component.attributes.name;
        }
    }
    return "egret.gui.SkinnableComponent";
}

function is_eui(text: string): boolean {
    if (text.indexOf('xmlns:e="http://ns.egret.com/eui"') > 0) {
        return true;
    } else {
        return false;
    }
}

function getTargetName(fileName:string):string {
    var lastIndex = fileName.lastIndexOf("\\");
    var preFix = fileName.substr(0,lastIndex+1);
    var rawName = fileName.substr(lastIndex+1);
    rawName = rawName.split(".")[0];
    lastIndex = rawName.lastIndexOf("Skin");
    if(lastIndex==rawName.length-4){
        return preFix+rawName.substr(0,lastIndex)+".ts";
    }else{
        return preFix+rawName+".ts";
    }
}