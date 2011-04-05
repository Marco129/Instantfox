	/*
		InstantFoxComp Depends on:
		(https://developer.mozilla.org/en/XPCOMUtils.jsm)
		https://developer.mozilla.org/en/How_to_implement_custom_autocomplete_search_component
		Firefox 4 handling
	*/
	
	const Cc	= Components.classes;
	const Ci	= Components.interfaces;
	const Cr	= Components.results;
	const Cu	= Components.utils;
	
	Cu.import("resource://gre/modules/XPCOMUtils.jsm");
	
	var InstantFox_Comp = {
		processed_results:false,
		Wnd:'',
		
		xhttpreq:false
		
	}
	
   function debug(aMessage) {

		try {
			var objects = [];
			objects.push.apply(objects, arguments);
			Firebug.Console.logFormatted(objects,
			TabWatcher.getContextByWindow
			(content.document.defaultView.wrappedJSObject));
		}
		catch (e) {
		}
			
						var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService
			(Components.interfaces.nsIConsoleService);
						if (aMessage === "") consoleService.logStringMessage("(empty string)");
						else if (aMessage != null) consoleService.logStringMessage(aMessage.toString());
						else consoleService.logStringMessage("null");
	}

	
	function SearchAutoCompleteResult(result, search_result, maxNumResults){
		if(InstantFox_Comp.processed_results){return;}
		this._result		= result;
		this._search_result	= search_result;
		this._maxNumResults	= maxNumResults;
	};
	
	SearchAutoCompleteResult.prototype = {
		get searchString(){
			try{
				return this._result.searchString;
			}
			catch(e){
				return "";
			}
		},
		
		get searchResult(){
			try{
				switch(this._result.searchResult){
					case Ci.nsIAutoCompleteResult.RESULT_NOMATCH:
						if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING;
						else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
						else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_NOMATCH;
						break;
					case Ci.nsIAutoCompleteResult.RESULT_SUCCESS:
						if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
						else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
						else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS;
						break;
					case Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING:
						if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING;
						else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
						else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_NOMATCH_ONGOING;
						break;
					case Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING:
						if(this._search_result.values == null)				return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
						else if(this._search_result.values.length > 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
						else if(this._search_result.values.length == 0)		return Ci.nsIAutoCompleteResult.RESULT_SUCCESS_ONGOING;
						break;
					default:
						return this._result.searchResult;
				}
			}
			catch(e){}
		},
		
		get defaultIndex(){
			if(this._result.defaultIndex == -1 && this._search_result.values != null && this._search_result.values.length > 0){
				return 0;
			}
			return this._result.defaultIndex;
		},
		
		get errorDescription(){
			return this._result.errorDescription;
		},
		
		get matchCount(){
			try{
				var numResults = Math.min(this._result.matchCount, this._maxNumResults);
				if(this._search_result.values != null){
					numResults += this._search_result.values.length;
				}
				return numResults;
			}
			catch(e){
				return 0;
			}
		},
		
		getValueAt: function(index){//#1
			try{
				var numResults = Math.min(this._result.matchCount, this._maxNumResults);
				if(index < numResults){
					return this._result.getValueAt(index);
				}
				else{
					//Hack because of duplicate array printing
					if(this._search_result.last[index - numResults]){
						InstantFox_Comp.processed_results = true;
					}
					return this._search_result.values[index - numResults];
				}
			}
			catch(e){
				return "";
			}
		},
		
		getCommentAt: function(index){//#3
			try{
				var numResults = Math.min(this._result.matchCount, this._maxNumResults);
				if(index < numResults){
					return this._result.getCommentAt(index);
				}
				else{
					return this._search_result.comments[index - numResults];
				}
			}
			catch(e){
				return "";
			}
		},
		
		getStyleAt: function(index){//#4
			try{
				var numResults = Math.min(this._result.matchCount, this._maxNumResults);
				if(index < numResults){
					return this._result.getStyleAt(index);
				}
				else{
					return "InstantFoxSuggest";
				}
			}
			catch(e){
				return "InstantFoxSuggest";
			}
		},
		
		getImageAt: function(index){//#2
			try{
				var numResults = Math.min(this._result.matchCount, this._maxNumResults);
				if(index < numResults){
					return this._result.getImageAt(index);
				}
				else{
					return this._search_result.images[index - numResults];
				}
			}
			catch(e){
				return "";
			}
		},
		
		removeValueAt: function(index, removeFromDb){
			try{
				var numResults = Math.min(this._result.matchCount, this._maxNumResults);
				if(index < numResults){
					return this._result.removeValueAt(index, removeFromDb);
				}
				else{
					this._search_result.values.splice(index - numResults, 1);
					this._search_result.comments.splice(index - numResults, 1);
					this._search_result.images.splice(index - numResults, 1);
				}
			}
			catch(e){}
			
		},
		
		QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIAutoCompleteResult]),
	};
		
	
	function InstantFoxSearch(){}
	InstantFoxSearch.prototype = 
	{
		classDescription: "Autocomplete 4 InstantFox",
		classID:          Components.ID("c541b971-0729-4f5d-a5c4-1f4dadef365e"),
		contractID:       "@mozilla.org/autocomplete/search;1?name=instantFoxAutoComplete",
		QueryInterface:   XPCOMUtils.generateQI([Components.interfaces.nsIAutoCompleteSearch]),
		startSearch:      function(searchString, searchParam, previousResult, listener)
		{
			InstantFox_Comp.Wnd = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
			
			var api = InstantFox_Comp.Wnd.InstantFox.query4comp();
			/*
				api return('query':query, 'key':parsed.key, 'json':json, 'gotourl':gotourl); OR false!
			*/
			InstantFox_Comp.processed_results = false;
			
			if(api){
				var num_history_results = 4;
				var history_string		= InstantFox_Comp.Wnd.InstantFox.rand4comp();
				//searchString			= searchString.substr((api['key'].length+1),searchString.length); // key + space (+1) e.g. g = 2 chars				

			}else{
				var num_history_results = 10;
				var history_string		= searchString;
			}
			//Search the user's history
			this.historyAutoComplete		= Components.classes["@mozilla.org/autocomplete/search;1?name=history"].createInstance(Components.interfaces.nsIAutoCompleteSearch);
			var _search						= this;
			_search._result					= null;
			var internal_results			= {values: [], comments: [], images: [], last: []};
			autoCompleteObserver = {
				onSearchResult: function(search, result){
					_search._result = result;
					listener.onSearchResult(_search, new SearchAutoCompleteResult(result, internal_results, num_history_results));
				}
			};
			this.historyAutoComplete.startSearch(history_string, searchParam, null, autoCompleteObserver);
			
			if(!api['json']){
				if(typeof result!='undefined'){
					listener.onSearchResult(_search, new SearchAutoCompleteResult(result, internal_results, num_history_results));
				}
				return true;
			}

			var xhttpreq = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
			xhttpreq.open("GET", api['json'], true); 
			
			
			xhttpreq.addEventListener("load", function(event){
				if(api['key'] == 'e'){
					var rtoparse = xhttpreq.responseText;//JSON.parse(InstantFox_Comp.xhttpreq.responseText);
					rtoparse = rtoparse.replace('vjo.darwin.domain.finding.autofill.AutoFill._do(', '');
					rtoparse = rtoparse.substr(0,rtoparse.length-1);
				}else{
					var rtoparse = xhttpreq.responseText;	
				}

				try{
					var xhr_return = JSON.parse(rtoparse);
				}
				catch(e){
					var xhr_return = 'error';
				}
				
				
				var tmp_results = new Array();
				var type_not_found = true;
								
				// code could be redcued but no need ;)
				if(api['key'] == "e"){

					if(xhr_return[2]['sug']){
						type_not_found = false;
						
						var gotourl = api['gotourl'];
						
						for(var i=0; i < xhr_return[2]['sug'].length;i++){		
								var result_info	= {};
								var result		= xhr_return[2]['sug'][i];
								
								if(i==0){
									if(InstantFox_Comp.Wnd.InstantFox.current_shaddow !=  result){
										InstantFox_Comp.Wnd.InstantFox.current_shaddow = result;
										InstantFox_Comp.Wnd.XULBrowserWindow.InsertShaddowLink(result,api['query'])
									}
								}
								
								result_info.icon			= "";
								result_info.title			= result;
								result_info.url				= gotourl.replace('%q', result);
																						
								tmp_results.push(result_info);
								
								internal_results.values.push(result_info.url);
								internal_results.comments.push(result_info.title);
								internal_results.images.push(result_info.icon);
								
								if(i==xhr_return[2]['sug'].length-1){
									internal_results.last.push(true);
								}else{
									internal_results.last.push(false);
								}
						}		
					}
				}
				
				if(api['key'] == "m"){

					if(xhr_return[2]){
						type_not_found = false;
						
						var gotourl = api['gotourl'];
						
						for(var i=0; i < xhr_return[3].length;i++){		
								var result_info	= {};
								var result		= xhr_return[3][i];
								
								if(i==0){
									if(InstantFox_Comp.Wnd.InstantFox.current_shaddow !=  result){
										InstantFox_Comp.Wnd.InstantFox.current_shaddow = result;
										InstantFox_Comp.Wnd.XULBrowserWindow.InsertShaddowLink(result,api['query'])
									}
								}
								
								result_info.icon			= "";
								result_info.title			= result;
								result_info.url				= gotourl.replace('%q', result);
																						
								tmp_results.push(result_info);
								
								internal_results.values.push(result_info.url);
								internal_results.comments.push(result_info.title);
								internal_results.images.push(result_info.icon);
								
								if(i==xhr_return[3].length-1){
									internal_results.last.push(true);
								}else{
									internal_results.last.push(false);
								}
						}		
					}
				}
				if(api['key'] == "g" || api['key'] == "i" || api['key'] == 'y' || api['key'] == 'w' || api['key'] == 'a'){
					if(xhr_return[1]){
						type_not_found = false;
						
						var gotourl = api['gotourl'];
						
						for(var i=0; i < xhr_return[1].length;i++){		
								var result_info	= {};
								var result		= xhr_return[1][i];

								if(i==0){
									if(InstantFox_Comp.Wnd.InstantFox.current_shaddow != result){
										InstantFox_Comp.Wnd.InstantFox.current_shaddow = result;
										InstantFox_Comp.Wnd.XULBrowserWindow.InsertShaddowLink(result,api['query'])
									}
								}
								
								result_info.icon			= "";
								result_info.title			= result;
								result_info.url				= gotourl.replace('%q', encodeURIComponent(result));
																						
								tmp_results.push(result_info);
								
								internal_results.values.push(result_info.url);
								internal_results.comments.push(result_info.title);
								internal_results.images.push(result_info.icon);
								
								if(i==xhr_return[1].length-1){
									internal_results.last.push(true);
								}else{
									internal_results.last.push(false);
								}
						}		
					}

				}
				
				if(type_not_found){
					result_info	= {};
				}

				if(xhr_return != "error"){
					if(_search._result != null){
						listener.onSearchResult(_search, new SearchAutoCompleteResult(_search._result, internal_results, 9));
					}
				}
			}, false);
						
			xhttpreq.send(null);//InstantFox_Comp.xhttpreq.send(null);
			this._req = xhttpreq;
		},
		
		stopSearch: function(){
			this.historyAutoComplete.stopSearch();
			if(this._req){
			    //this._req.abort();
			}

		},
	};
	
	
	
	
	function NSGetModule(compMgr, fileSpec){
		return XPCOMUtils.generateModule([InstantFoxSearch]);
	}
		
