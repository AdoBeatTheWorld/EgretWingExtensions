import * as wing from 'wing';
import * as path from 'path';
import * as fs from 'fs';

var parser = require('xml-parser');

export function activate() {
	wing.commands.registerCommand('extension.ExmlToClass', doExchange);
}

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
    let baseClass = isEui ? "eui.Panel" : getHostComponent(xml);
    let classComponents = parseSkinConponents(xml,isEui);
    let targetFileName = getTargetName(filename);
    let baseName = path.basename(targetFileName);
    var className = baseName.split(".")[0];
    var skinName = parseSkinname(filename);
    let classContent = assemble(className,baseClass,skinName,classComponents);
    fs.writeFileSync(targetFileName,classContent,{encoding:"utf-8"});
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
let contructorTemplate = "\tconstructor(){\r\t\tsuper();\r\t\tthis.skinName=\"{skinName}\";\r\t}"
let variableTemplate = "\tpublic {varName}:{varType};\r";
let partAddedMethodTemplate = "\tpublic partAdded(name:string, instance:any){\r\t\tsuper.partAdded(name, instance);\r{Variables}\r\t}";
let firstPartTemplate = "\t\tif(name == \"{varName}\"){\r\t\t\tthis.{varName}=instance;\r\t\t}";
let normalPartTemplate = "else if(name == \"{varName}\"){\r\t\t\tthis.{varName}=instance;\r\t\t}";
function assemble(className,baseClass,skinName,classComponents) {
    var classContent = "class "+className+" extends "+baseClass+"{\r";
    //constructor
    classContent += contructorTemplate.replace("{skinName}",skinName);
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
    classContent+="\r}";
    return classContent;
}

function parseSkinConponents(content,isEui) {
    var arr = content.root.children;
    var len = arr.length;
    var component;
    var ignoreTypes = ["e:states","w:Declarations","w:HostComponent"];
    var typePreFix:string = isEui ? "eui." : "egret.gui.";
    var componentType:string;
    var componentName:string;
    var result = [];
    for(var i = 0; i < len; i++){
        component = arr[i];
        if(!component.attributes["id"]) continue;
        
        componentName = component.name;
        if (ignoreTypes.indexOf(componentName)==-1) {
            componentType = typePreFix + componentName.split(":")[1];
            componentName = component.attributes["id"];
            result.push([componentType, componentName]);
        }
    }
    return result;
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