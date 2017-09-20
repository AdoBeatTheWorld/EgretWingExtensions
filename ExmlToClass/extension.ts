import * as wing from 'wing';
import * as path from 'path';
import * as fs from 'fs';
import {IStoreSchema,IStoreSchemaMap,IFormOptions,PopupType,Store} from 'wing';
var parser = require('xml-parser');

export function activate(context: wing.ExtensionContext) {
	wing.commands.registerCommand('extension.ExmlToClass', doExchange);
	// console.log('regist exmaltoclass');
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
    baseClass = isEui ? "eui.Component" : getHostComponent(xml);
    parseNS(xml);
    classComponents = parseSkinConponents(xml,isEui);
    let targetFileName = getTargetName(filename);
    let baseName = path.basename(targetFileName);
    properties = {
	   inputbox: targetFileName
    };
    className = baseName.split(".")[0];
    //skinName = parseSkinname(filename);
    wing.window.showPopup<IFormOptions>(PopupType.Form, new Store(properties, schema),{
        title : "输出设置"
    }).then((result)=>{
        let settings = result.getProperties(true);
        let classContent = assemble(className,baseClass,skinName,classComponents,settings);
        fs.writeFileSync(settings["inputbox"],classContent,{encoding:"utf-8"});
        wing.window.showInformationMessage('生成成功:'+settings["inputbox"]);
    })
    
}

function parseNS(content) {
    var tempArr;
    for(var key in content.root.attributes){
        // console.log(key ,content.root.attributes[key]);
        if( key.indexOf("xmlns:") == 0 && ["xmlns:w","xmlns:e"].indexOf(key) == -1){
            tempArr = key.split(":");
            namespaces[tempArr[1]] = content.root.attributes[key];
        }if( key == "class"){
            skinName = content.root.attributes[key];
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
const viewTemplate:any = require('./view');
const classTemplate = viewTemplate.classTemplate;
const contructorTemplate = viewTemplate.contructorTemplate;
const variableTemplate = viewTemplate.variableTemplate;
const singletonTemplate = viewTemplate.singletonTemplate;
const childrenCreatedTemplate = viewTemplate.childrenCreatedTemplate;
const addHandlerTemplate = viewTemplate.addHandlerTemplate;
const addStageTemplate = viewTemplate.addStageTemplate;
function assemble(className,baseClass,skinName,classComponents,settings) {
    let tempString:string;
    className = settings["inputbox"];
    if( className.indexOf("\\")!=-1)
        className = className.substr(className.lastIndexOf("\\")+1);
    if( className.indexOf(".")!=-1)
        className = className.split(".")[0];
    let classContent = classTemplate.replace('{modulename}',className).replace('{baseClass}',baseClass);//"class "+className+" extends "+baseClass+"{\r";
    //constructor
    classContent = classContent.replace("{skinName}",skinName);
    if(  settings["checkbox3"] ){
        classContent = classContent.replace("{addHandler}",addHandlerTemplate);
        classContent = classContent.replace("{addStage}",addStageTemplate);
    }else{
        classContent = classContent.replace("{addHandler}","");
         classContent = classContent.replace("{addStage}","");
    }
    var len = classComponents.length;
    var component;
    var componentName:string;
    var componentType:string;
    var variables:string = "";
    for(var i = 0; i < len; i++){
        component = classComponents[i];
        componentType = component[0];
        componentName = component[1];
        variables += variableTemplate.replace("{varName}",componentName).replace("{varType}",componentType);
    }

    classContent = classContent.replace("{components}",variables);
    if( settings["checkbox1"] ){
        classContent = classContent.replace("{childrenCreated}",childrenCreatedTemplate);
    }
    if( settings["checkbox"] ){
        tempString = singletonTemplate;
        while(tempString.indexOf("{className}")!=-1){
            tempString = tempString.replace("{className}",className);
        }
        classContent = classContent.replace("{Instance}",tempString);
    }
    // classContent+="\r}";
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