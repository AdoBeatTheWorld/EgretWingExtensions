export ={
    classTemplate :"/*\r\n* 视图模板\r\n*/\r\n"+
    "class {modulename} extends {baseClass}{\r\n\r\n"+
        "\t//todo components\r\n"+
        "{components}\r\n"+
        "\tpublic constructor(){\r\n\t\t"+
            "super();\r\n\t\t"+
            'this.skinName = "{skinName}";\r\n\t\t'+
            "this.addEventListener(eui.UIEvent.CREATION_COMPLETE,this.onUIComplete,this);\r\n\t"+
             "{addHandler}\r\n\t"+
        "}\r\n\r\n\t"+
        "public onUIComplete(){\r\n\t\t"+
        "//todo\r\n\t"+
        "}\r\n\t"+
        "{addStage}\r\n\t"+
        "{childrenCreated}\r\n\t"+
        "{Instance}\r\n}",

contructorTemplate : "\t\tthis.skinName=\"{skinName}\";\r\t{addHandler}\r\t}",
variableTemplate : "\tpublic {varName}:{varType};\r",
singletonTemplate : "\r\tprivate static _instance:{className};\r\tpublic static get Instance():{className}{\r\t\tif({className}._instance == null){\r\t\t\t{className}._instance = new {className}();\r\t\t}\r\t\treturn {className}._instance;\r\t}",
childrenCreatedTemplate : "\r\tpublic childrenCreated(){\r\t\tsuper.childrenCreated();\r\t\t\/\/todo\r\t}\r",
measureTemplate : "\r\tpublic measure(){\r\t\tsuper.measure();\r\t\t\/\/todo\r\t}\r",
addHandlerTemplate : "\tthis.addEventListener(egret.Event.ADDED_TO_STAGE,this.onAdded, this );\r\t\tthis.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.onRemoved, this);",
addStageTemplate : "\r\tprivate onAdded(evt:egret.Event){\r\t\t\/\/todo\r\t}\r\r\tprivate onRemoved(evt:egret.Event){\r\t\t\/\/todo\r\t}\r",
}