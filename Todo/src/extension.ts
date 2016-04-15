import * as wing from 'wing';
import * as fs from 'fs';
import * as path from 'path';

var readline = require('readline');
var async = require('async');

var project_path = "";//current project name
let source_path;
let todo_path;

export function activate() {
	wing.commands.registerCommand('extension.todo', run);
}
let localStorage;
function run() {
	project_path = wing.workspace.rootPath;
	source_path = project_path +"\\src"
	todo_path = project_path+"\\todo.data";
	fs.exists(todo_path,function(result) {
		if( result ){
			localStorage = fs.readFileSync(todo_path,'utf-8');
			localStorage = JSON.parse(localStorage);
		}else{
			localStorage = {};
		}
		initLoop();
	});
}

function saveTodo() {
	fs.writeFileSync(todo_path,JSON.stringify(localStorage),{encoding:'utf-8'});
	wing.window.showInformationMessage('TodoList refreshed');
}

function initLoop() {
	loopDir(source_path);
}
var totalFiles = 0;
var finishedFiles = 0;
function loopDir(dirpath) {
	fs.readdir(dirpath,function(err,result) {
		if( err ){
			wing.window.showErrorMessage(err.message);
			return;
		}
		var len = result.length;
		var element;
		var temppath;
		async.each(result, function(element, callback){
			temppath = path.join(dirpath,element);
			if( fs.statSync(temppath).isDirectory()){
				loopDir(temppath);
			}else{
				checkFile(temppath);
			}
		})
	})
}

function checkFile(filepath) {
	totalFiles++;
	var lowline:string;
	var index;
	var todoContent;
	fs.readFile(filepath,'utf8',function(err, data) {
		if( err != null){
			console.error(err);
			return;
		}
		var content = <string>data;
		var lines = content.split('\r\n');
		var line:string;
		var len = lines.length;
		for(var i = 0; i < len; i++){
			line = lines[i];
			lowline = line.toLowerCase().trim();
			index = lowline.indexOf("//todo");
			if( index != -1){
				todoContent = line.substr(index+6);
				if(localStorage[filepath] == null){
					localStorage[filepath] = [];
				}
				localStorage[filepath].push({line:i,todo:todoContent});
			}
			
			index = lowline.indexOf("//fixme");
			if( index != -1){
				todoContent = line.substr(index+6);
				if(localStorage[filepath] == null){
					localStorage[filepath] = [];
				}
				localStorage[filepath].push({line:i,todo:todoContent});
			}
		}
		finishedFiles++;
		console.log(finishedFiles+"/"+totalFiles);
		if( finishedFiles == totalFiles){
			saveTodo();
		}
	});
}