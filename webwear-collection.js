
var Visit = Class.extend({

	init: function(user,rawUrl,title){
		this.user = user;
		this.rawUrl = rawUrl;
		this.cleanUrl = util.parseCleanUrl(rawUrl);
		this.domain = util.parseDomain(rawUrl);
		this.search = util.parseQueryParam(rawUrl);
		this.title = title;
		
		this.startTime = new Date();
		this.endTime = null;
		this.length = null;
	},
	
	endVisit: function(){
		this.endTime = new Date();
		this.length = this.endTime - this.startTime;
		
		//criteria by which to store a visit... must be longer than 1 second
		if (this.length > 1000){
			chrome.extension.sendRequest(
				{type:"storeVisit", data:this}, 
				function(response) {
					if (WebWearDebug) console.log(response);
				}
			);
		}
	}		
});

var LogVisit = Visit.extend({
	init: function(user,rawUrl,title){
		this.actions = [];
		this.lastAction = -1;
		this._super(user,rawUrl,title);
	},
	
	endVisit: function(){
		this.endTime = new Date();
		
		this.length = this.endTime - this.startTime;
		//close up any open actions
		this.endAction();
		
		chrome.extension.sendRequest(
			{type:"logVisit", data:this}, 
			function(response) {
				if (WebWearDebug) console.log(response);
			}
		);
	},
	addShortAction: function(type){
		if (this.actions.length > 0 && this.lastAction != -1 && this.actions[this.lastAction].end == null){
			this.actions[this.actions.length-1].shortActions.push(
				{
					type: type,
					time: new Date()
				}
			);
		}
		else{
			this.actions.push(
				{
					type: type,
					time: new Date()
				}
			);
		}
	},
	startAction: function(type){
		//close up any open actions
		this.endAction();
		
		//start new action
		this.actions.push({
			type: type,
			start: new Date(),
			end: null,
			length: null,
			shortActions: []
		});
		
		this.lastAction = this.actions.length - 1;
	},
	endAction: function(){
		if (this.actions.length > 0 &&  this.lastAction != -1 && this.actions[this.lastAction].end == null){
			this.actions[this.actions.length-1].end = new Date();
			this.actions[this.actions.length-1].length = (new Date() - this.actions[this.actions.length-1].start);
		}
	}
});

var Task = Class.extend({
	init: function(user,task,condition){
	    this.type = 'ExperimentTask';
		this.user = user;
		this.taskId = task;
		this.condition = condition;
		
		this.startTime = new Date();
		this.endTime = null;
		this.length = null;
		this.answer = null;
	},
	
	endTask: function(answer){
		this.endTime = new Date();
		this.length = this.endTime - this.startTime;
		this.answer = answer;
	}		
});
