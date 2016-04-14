import * as wing from 'wing';
import * as path from 'path';
import * as fs from 'fs';


var parser = require('xml-parser');

export function activate() {
	console.log('activated..');
	wing.commands.registerCommand('mapedit.generate', doit);
	doit();
}

function doit() {
	console.log("doit");
	let resource_json_path = wing.workspace.rootPath+"/resource/resource.json";
	let e = wing.window.activeTextEditor;
	let fileName = e.document.fileName;
	var mapObj = {};
	var mapId = parseInt(path.basename(fileName).replace("Map_",""));
	mapObj['tiles'] = [];
	mapObj['buildings'] = [];
	var xml = parser(e.document.getText());
	
	var arr = xml.root.children;
	var len = arr.length;
	var component;
	var id:string;
	var name;
	var tileObj;
	for(var i = 0; i < len; i++){
		component = arr[i];
		id = component.attributes['id'];
		name = component.attributes['name'];
		if(id.indexOf("tile_")!=-1){
			tileObj = {};
			tileObj.id = parseInt(id.replace("tile_",""));
			tileObj.x = component.attributes['x'];
			tileObj.y = component.attributes['y'];
			mapObj['tiles'].push(tileObj);
		}else if( id.indexOf("building_")!=-1){
			tileObj = {};
			tileObj.id = parseInt(id.replace("building_",""));
			tileObj.x = component.attributes['x'];
			tileObj.y = component.attributes['y'];
			mapObj['buildings'].push(tileObj);
		}else if( id.indexOf("bg_")!=-1){
			mapObj['bg'] = parseInt(id.replace("bg_",""));
		}else{
			console.log("what is this");
		}
	}
	
	fs.readFile(resource_json_path,'utf8', function (error, data) {
		var resourceJson = JSON.parse(data);
		if( resourceJson.map == null){
			resourceJson.map = {};
		}
		resourceJson.map[mapId] = mapObj;
		fs.writeFile(resource_json_path,JSON.stringify(resourceJson));
	});
}