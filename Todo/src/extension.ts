import * as wing from 'wing';
import * as fs from 'fs';
import * as path from 'path';

let readline = require('readline');

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
		fs.writeFileSync(todo_path,JSON.stringify(localStorage),{encoding:'utf-8'});
		wing.window.showInformationMessage('TodoList refreshed');
	});
}


function initLoop() {
	loopDir(source_path);
}

function loopDir(dirpath) {
	fs.readdir(dirpath,function(err,result) {
		if( err ){
			wing.window.showErrorMessage(err.message);
			return;
		}
		var len = result.length;
		var element;
		var temppath;
		for (var i = 0; i < len; i++) {
			element = result[i];
			temppath = path.join(dirpath,element);
			if( fs.statSync(temppath).isDirectory()){
				loopDir(temppath);
			}else{
				checkFile(temppath);
			}
		}
	})
}

function checkFile(filepath) {
	var lineReader = require('readline').createInterface({
		input: fs.createReadStream(filepath)
	});
	var lowline:string;
	var index;
	var todoContent;
	var lineIndex = 0;
	lineReader.on('line',function(line){
		lowline = line.toLowerCase().trim();
		index = lowline.indexOf("//todo");
		if( index != -1){
			todoContent = lowline.substr(index+6);
			if(localStorage[filepath] == null){
				localStorage[filepath] = [];
			}
			localStorage[filepath].push({line:lineIndex,todo:todoContent});
		}
		lineIndex++;
	});
	/**
	fs.readFile(filepath,function (err, result) {
		if(err){
			wing.window.showErrorMessage(err.message);
			return;
		}
	});
	*/
}