// Copyright (c) 2012 Kitchology. All rights reserved.

// Show correct menu depending on whether the user is logged in.

var storage = chrome.storage.local; //Uses Chrome local storage
var userLoggedIn = null;  //Variable to store the logged in user name
var oauth_sig = null; //empty variable to put the oauth signature
        
var makeSignedRequest = function(ck,cks,encodedurl) {     
 
	var accessor = { consumerSecret: cks, tokenSecret: ""};          
	var message = { action: encodedurl, 
					method: "GET", 
					parameters: [["oauth_version","1.0"],["oauth_consumer_key",ck]]};
 
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
 
	var parameterMap = OAuth.getParameterMap(message);
	var baseStr = OAuth.decodeForm(OAuth.SignatureMethod.getBaseString(message));           
	var theSig = "";
 
	if (parameterMap.parameters) {
		for (var item in parameterMap.parameters) {
			for (var subitem in parameterMap.parameters[item]) {
				if (parameterMap.parameters[item][subitem] == "oauth_signature") {
					theSig = parameterMap.parameters[item][1];                    
					break;                      
				}
			}
		}
	}
 
	var paramList = baseStr[2][0].split("&");
	paramList.push("oauth_signature="+ encodeURIComponent(theSig));
	paramList.sort(function(a,b) {
		if (a[0] < b[0]) return -1;
		if (a[0] > b[0]) return 1;
		if (a[1] < b[1]) return  -1;
		if (a[1] > b[1]) return 1;
		return 0;
	});
 
	var locString = "";
	for (var x in paramList) {
		locString += paramList[x] + "&";                
	}
 
	var finalStr = baseStr[1][0] + "?" + locString.slice(0,locString.length - 1);
 
	return finalStr;
	
	};
	
	
$(document).ready(
  function() {
    //$('p').text('jQuery Successfully loaded.');
    
    $('div#logindialog').dialog( { //Hide login dialog unless user is not logged in
      autoOpen: false
    });
    
    $('div#savedialog').dialog( { //Hide save dialog unless user selects save
      autoOpen: false
    });
    
    $('div#settingsdialog').dialog( { //Hide settings dialog unless user selects settings
      autoOpen: false
    });
    
    /*  Checks to see if a user is stored in the Chrome storage.  If so, then it shows the logged in menu.  If not, then it shows the login dialog box. */
    storage.get('user', function(items) {
      if(!items.user) {    
        $('div#logindialog').dialog('open');
        
      }      
      else {
        showLoggedInMenu();
      }       
    
    });    
    
    /*  Function to show the menu */            
    function showLoggedInMenu() {
      $('div#loggedinmenu').css('display','inline');
      $('#menu').menu();
    }  


    
    /* Function to bring user to Kitchology.com   */
    $('#menugotoKitch').click(
    	function(){
 		chrome.tabs.create({ 'url' : 'kitchology.html'});
    });
    
    
    /*  Upon selection of "Login" button, this function confirms that correct name and password have been entered and logs in the user. */
    $('#userlogin').click(
      function() {  
            //stores the input into these variables
        userLoggedIn = $('input[name="userName"]').val();
        var userPassword = $('input[name="password"]').val();
        var currentTab = null;
        
        chrome.tabs.getSelected(null,function(tab) {
   			currentTab = tab.url;
		});
        
 
		var loginParams = "grant_type=password&username=" + userLoggedIn + "&password=" + userPassword;
		function callback(){ return true; }	
	
		$.ajax({
        url: 'https://web.kitchology.com/api/v1/users/login',
    	type: 'POST',
    	datatype: 'json',
    	data: loginParams,
    	success: function(data) {   		
			storage.set({'access_token':data.access_token}, function() {
                storage.set({'mac_key':data.mac_key}, function() {   	
                    storage.set({'user':userLoggedIn}, function() {      
                        $('div#logindialog').dialog('close');              
                        showLoggedInMenu();
                        return true;
                    });
                });
            });
                //$('p').text('The access token is: ' + data.access_token + ' ' + data.mac_key);
    	},
    	error: function() { alert('Failed!'); },
    	beforeSend: setHeader
		});
       function setHeader(xhr) {
			 xhr.setRequestHeader('Origin', currentTab);
		}
		
		
      });
    
    /*  Function to save recipe when the Save Recipe menu item is selected */
    $('#menusaverecipes').click(
      function() {
      
        $('div#loggedinmenu').css('display','none');
        $('div#savedialog').dialog('open');              
      }
    );    
    
       /* Function to bring back to the main menu after saving recipe  */
    $('#saverecipe').click(
      function() {
      
      var sharerecipebox = false;
        //function to see if checkbox is checked      
        	if($('#sharerecipe').prop("checked")){
      			sharerecipebox = true;
      		}
      		
 		oauth_sig = makeSignedRequest(<storage.mac_key>, <storage.access_token>," https://web.kitchology.com/api/v1/urls/secure");
     	var currentTab3 = null; 		
     	
     	var timeStamp = OAuth.timestamp();
     	var nonce = OAuth.nonce();
     			
		chrome.tabs.getSelected(null,function(tab) {
   			currentTab3 = tab.url;
		});
		
		var saveParams = "url=" + currentTab3 + "&notify_family=" + sharerecipebox;
		
		$.ajax({
         url: ' https://web.kitchology.com/api/v1/urls/secure',
  		 type: 'POST',
   		 datatype: 'json',
   		 data: saveParams;
   		 success: function() { alert("Success"); },
   	 	 error: function() { alert('Failed!'); },
    	 beforeSend: setHeaders
    	});
    	
      function setHeaders(xhr) {
		 xhr.setRequestHeader('Authorization',OAuth
		 											oauth_consumer_key= storage.mac_key,
		 											oauth_nonce= nonce, 
		 											oauth_signature= oauth_sig, 
		 											oauth_signature_method="HMAC-SHA1", 
		 											oauth_timestamp=timeStamp,
		 											oauth_token = storage.token, 
		 											oauth_version=1.0
		 											 );								
		 xhr.setRequestHeader('Origin', currentTab3);
		}     		
      		
      		
      		
        $('div#savedialog').dialog('close');
        showLoggedInMenu();
      }
    );
    
    
        /* Function to bring back to main menu after canceling saving recipe */
     $('#cancel').click(
      function() {
        $('div#savedialog').dialog('close');
        showLoggedInMenu();
      }
    );   
    
    
    /*  Function to show settings when the Settings menu item is selected */
    $('#menusettings').click(
      function() {
        $('div#loggedinmenu').css('display','none');
        $('div#settingsdialog').dialog('open');              
      }
    ); 
    
    
         /* Function for when settings are saved (right now just back to menu) */
     $('#savesettings').click(
      function() {
      //function to see if checkbox is checked      
        if($('#setting1').prop("checked")){
      		//alert("settings saved");
      		}
        $('div#settingsdialog').dialog('close');
        showLoggedInMenu();
      }
    );   
       
    
    /* Function to bring back to main menu after canceling settings */
     $('#cancel2').click(
      function() {
        $('div#settingsdialog').dialog('close');
        showLoggedInMenu();
      }
    );   
    
    
    /*  Function to show recipes of the user when the Show Recipes menu item is selected */    
    $('#menushowrecipes').click(
      function() {        
/*
		oauth_sig = makeSignedRequest(<storage.mac_key>, <storage.access_token>,"https://web.kitchology.com/api/v1/users/recipes/secure");
     	var currentTab2 = null; 				
		chrome.tabs.getSelected(null,function(tab) {
   			currentTab2 = tab.url;
		});
		
		$.ajax({
         url: 'https://web.kitchology.com/api/v1/users/recipes/secure',
  		 type: 'GET',
   		 datatype: 'json',
   		 success: function() { alert("Success"); },
   	 	 error: function() { alert('Failed!'); },
    	 beforeSend: setHeaders
    	});
    	
      function setHeaders(xhr) {
		 xhr.setRequestHeader('Authorization',OAuth
		 											oauth_consumer_key= storage.token_secret,
		 											oauth_nonce="7d8f3e4a", 
		 											oauth_signature= oauth_sig, 
		 											oauth_signature_method="HMAC-SHA1", 
		 											oauth_timestamp=timeStamp, 
		 											oauth_version=1.0 );					
		 xhr.setRequestHeader('Origin', currentTab2);
		}
		
		*/
      
        $('div#loggedinmenu').css('display','none'); //Hide the menu
        $('#recipes').dataTable( {
         "bProcessing": true,
         "bDestroy": true,
         "bRetrieve":true,
   		 "sAjaxSource": "https://web.kitchology.com/api/v1/users/recipes",
         "aoColumns": [
            { "sTitle": "Name" },
            { "sTitle": "Description" },
            { "sTitle": "URL" }
        ]
        });
        $('div#recipetable').css('display','inline');
      }
    );
    
    	/* Function to bring back to main menu from recipe table */
     $('#tablecancel').click(
      function() {
        $('div#recipetable').css('display','none');
       // $('div#recipes').css('display','none');
        $('div#loggedinmenu').css('display','inline');
      
      }
    );   
    
    /*  Function to logout the user when the Logout menu item is selected */
    $('#menulogout').click(  
      function() {
        storage.clear();
        userLoggedIn = null;
        $('div#loggedinmenu').css('display','none');
        $('div#logindialog').dialog('open');             
      }
    );
});
