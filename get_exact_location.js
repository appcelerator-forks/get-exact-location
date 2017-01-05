if (typeof Alloy == "undefined") Alloy = require("alloy");
if (typeof _ == "undefined") _ = Alloy._;

function get_exact_location(meters_accurate_enough, app_name, what_the_action_is, S_inform_obj, callback) {
	
	Ti.API.info("getting exact location");
	
	//check for permission
	
	if (OS_IOS) {
	
		if (Ti.Geolocation.locationServicesEnabled) {
	        
			Ti.API.info("location services enabled");
			
	        if (Titanium.Geolocation.locationServicesAuthorization == Ti.Geolocation.AUTHORIZATION_ALWAYS
	                || Titanium.Geolocation.locationServicesAuthorization == Ti.Geolocation.AUTHORIZATION_AUTHORIZED
	                || Titanium.Geolocation.locationServicesAuthorization == Ti.Geolocation.AUTHORIZATION_WHEN_IN_USE) {
	        	
	            Ti.API.info("location authorization good to go.");
	            
	            after_permissions_check();
	        }
	                                                    
	        else if (Titanium.Geolocation.locationServicesAuthorization == Ti.Geolocation.AUTHORIZATION_DENIED
	        			|| Titanium.Geolocation.locationServicesAuthorization == Ti.Geolocation.AUTHORIZATION_RESTRICTED) {
	            
				Ti.API.info("blocked for the app");
				
				var settingsURL = Ti.App.iOS.applicationOpenSettingsURL;
				var can_send = settingsURL && Ti.Platform.canOpenURL(settingsURL);
				
				var message = "You blocked location services. You cannot " + what_the_action_is + " without location services."
                	+ " To continue, please enable at Settings > " + app_name + "." + (can_send ? " Go there now?" : "");

	                
	            var alertt = Ti.UI.createAlertDialog({
	                
	                title: "Location Services",
	                message: message,
	                buttonNames: (can_send ? ["Not now", "Yes"] : ["OK"])
	            
	            });
	            
	            if (can_send) {
	            
	                alertt.addEventListener("click", function(e) {
	                
	                    if (e.index == 1) {
	                    	
	                    	Ti.Platform.openURL(settingsURL);
	                    }
	                });
	            }   
	                
	            alertt.show();
	            
	            callback({success: false});
	            
	            return;
				
	                            
	        } //end, if DENIED
	        
	        else {//unknown: keep going down to below.
	        	
				Ti.API.info("unknown location permission");
				
				var ulurtt = Ti.UI.createAlertDialog({
					
					title: "Please Allow Access",
					message: app_name + " uses your location so you can " + what_the_action_is + ".",
					buttonNames: ["OK, I understand"]
				});
				
				ulurtt.addEventListener("click", function() {
				
					Ti.Geolocation.requestLocationPermissions(Ti.Geolocation.AUTHORIZATION_WHEN_IN_USE, function(e) {
						
						Ti.API.info("response to locations request: " + JSON.stringify(e));
						
						if (!e.success) {
							
							//"aww shucks"
							
							callback({success: false});
						}
						
						else after_permissions_check();
					});
	        	});
	        	
	        	ulurtt.show();
	        }    
	    
		} //end if globally enabled
	        
		else {
		          
			Ti.API.info("blocked globally");
			
	        var ulurtt = Ti.UI.createAlertDialog({
	            title: "Phone location services disabled",
	            message: "You need location services to " + what_the_action_is + "."
	                + " To continue, please enable at Settings > Privacy > Location Services.",
	            buttonNames: ["OK"]
	        });
	                                                        
	        ulurtt.show();
			
			callback({success: false});
	        
	        return;
			
		} //end globally disabled
	}
	
	else if (OS_ANDROID) {
		
		if (Ti.Geolocation.hasLocationPermissions()) after_permissions_check();
		
		else {
			
			if (Ti.App.Properties.getBool("rejected_location", false)) {
				
				Ti.API.info("previously rejected");
				
				var message = app_name + " uses your location so you can " + what_the_action_is + "."
					+ " You can enable at App info > Permissions. Go there now?";
		
				var alertt = Ti.UI.createAlertDialog({
					
					persistent: true,
					title: "Location",
					message: message, 
					buttonNames: ["Yes", "Not now"]
				});
				
				
				
				alertt.addEventListener("click", function(e) {
				
					
					var k = e.index;
				
					Ti.API.info("index is " + k);
				
					if (k == 0) require("com.restadoapp.androidappsettings").go_to_app_settings();
				});
		
				
				alertt.show();
				
				callback({success: false});
			}
			
			else {
			
				Ti.API.info("unknown location permission");
				
				var ulurtt = Ti.UI.createAlertDialog({
					
					title: "Please Allow Access",
					message: app_name + " uses your location so you can " + what_the_action_is + ".",
					buttonNames: ["OK, I understand"]
				});
				
				ulurtt.addEventListener("click", function(e) {
				
					if (e.index == 0) {
					
						Ti.Geolocation.requestLocationPermissions(null, function(e) {
							
							Ti.API.info(JSON.stringify(e));
							
							if (e.success) after_permissions_check();
							
							else {
								
								Ti.App.Properties.setBool("rejected_location", true);
								
								callback({success: false});
							}
						});
					}
					
					else callback({success: false});
				});
				
				ulurtt.show();
			}
		}
	}
	
	function after_permissions_check() {	
		
		if (OS_ANDROID) {
			
			var androidisgpson = require("com.restadoapp.androidisgpson");
			var androidwifi2 = require("com.restado.androidwifi2");
			
			var start = Date.now();

			function time_elapsed() {
				
				return String((Date.now() - start)/1000);
			}

			function android_location_settings() {
				
				var intent = Ti.Android.createIntent({action: "android.settings.LOCATION_SOURCE_SETTINGS"});
				intent.addFlags(Ti.Android.FLAG_ACTIVITY_NEW_TASK);
			  	Ti.Android.currentActivity.startActivity(intent);
			}

			function enable_wifi() {
				
				androidwifi2.turnWifiOn();
				
				Ti.UI.createNotification({
				    message: "Enabling Wi-Fi adapter",
				    duration: Ti.UI.NOTIFICATION_DURATION_LONG
				}).show();
			}

			function seconds_since(location_event) {
				
				if (typeof location_event == "undefined" || !location_event || !location_event.coords) return 0;
				
				else return ((Math.floor((Date.now() - location_event.coords.timestamp) / 100)) / 10); //to nearest 10th of a second
			}	

			var gps_enabled = androidisgpson.getGPSState();
			var networks_allowed = androidisgpson.getNetworkProviderState();
			
			//gps_enabled || networks_allowed == location globally enabled
			
			var wifi_enabled = _.contains(["enabled", "enabling"], androidwifi2.getWifiState());

			Ti.API.info("network provider state is " + networks_allowed);

			var gpsProvider = null;
			var wifiProvider = null;

			var interv = null; //for both enabled
			var this_one_timeout = null; // for just one of the two of them

			var using = null; //"wifi" or "gps"
			var last_event = null;

			function createGPSprovider() {
				
				gpsProvider = Ti.Geolocation.Android.createLocationProvider({
					
				    name: Ti.Geolocation.PROVIDER_GPS,
				    minUpdateTime: 0, 
				    minUpdateDistance: 0.0
				});
			}

			function createWIFIprovider() {
				
				wifiProvider = Ti.Geolocation.Android.createLocationProvider({
					
				    name: Ti.Geolocation.PROVIDER_NETWORK,
				    minUpdateTime: 0, 
				    minUpdateDistance: 0.0
				});
			}

			function switch_provider() {
				
				if (using == "wifi") { //using wifi, switch to gps
					
					Ti.Geolocation.Android.addLocationProvider(gpsProvider);
					using = "gps";
				}
				
				else { //using gps or aren't using anything: switch to wifi
					
					Ti.Geolocation.Android.addLocationProvider(wifiProvider);
					using = "wifi";
				}
				
				Ti.Geolocation.Android.manualMode = true;
				
				Ti.API.info("switched to " + using);
				
				while (!interv) { 
					
					interv = setInterval(function() {
					
						var elapsed = seconds_since(last_event);
						
						if (elapsed > 1.1 && using) {
						
							Ti.API.info("elapsed: " + elapsed);
							
							switch_provider();
						}
					
					}, 1100);
				}
			}

			if (gps_enabled) {

				if (networks_allowed) {
					
					 if (wifi_enabled) both_enabled();
					 else just_gps();
				}
				
				else just_gps();
			}

			else { //gps disabled
				
				if (networks_allowed) {
					
					if (wifi_enabled) just_wifi();
					else neither_enabled();
				}
				
				else neither_enabled();
			}


			function neither_enabled () {
				
				if (networks_allowed) {
					
					var message = "To find your location, " + app_name + " needs to enable Wi-Fi or GPS.";
					var option1 = "Enable Wi-Fi";
				}
				
				else {
					
					var message = "To find your location, " + app_name + " needs to enable Network Locating or GPS.";
					var option1 = "Enable Network Locating";
				}
				
				var need_stuff = Ti.UI.createAlertDialog({
					
					message: message,
					buttonNames: ["Next"]
				});
				
				need_stuff.addEventListener("click", function() {
					
					var options = [option1, "Enable GPS", "Enable both", "Cancel"];
					
					var optionsss = Ti.UI.createOptionDialog({
						
						options: options
					});
					
					optionsss.addEventListener("click", function(e) {
						
						if (e.index == options.length - 1) return;
						
						else if (e.index == 0) { //enable Wi-Fi
							
							if (networks_allowed) { //wifi must be off
								
								enable_wifi();
								
								//do finding location with wifi only
								setTimeout(just_wifi, 0);
							}
							
							else {
								
								if (!wifi_enabled) {
									
									enable_wifi();
								}
								
								android_location_settings();
							}
						}
						
						else if (e.index == 1) { //enable GPS
							
							android_location_settings();
						}
						
						else if (e.index == 2) { //enable both
							
							if (!wifi_enabled) {
								
								enable_wifi();
							}
							
							android_location_settings();
						}
					});
					
					optionsss.show();
				});
				
				need_stuff.show();
				
				callback({
                	success: false
                });
			}

			function just_wifi() {
				
				var wifi_enable_attempts = 0;
				
				wifi_get_location();
				
				function wifi_get_location() {
					
					if (wifi_enable_attempts == 50) {
						
						Ti.UI.createAlertDialog({
							
							message: "There was a problem enabling your Wi-Fi adapter.",
							buttonNames: ["Dismiss"]
						}).show();
						
						callback({
                        	success: false,
                        	massive_location_failure: true
                        });
					}
					
					else if (androidwifi2.getWifiState() != "enabled") {
						
						++wifi_enable_attempts;
						setTimeout(wifi_get_location, 100);
					}
					
					else { //wifi enabled.
						
						while (!this_one_timeout) {
						
							Ti.API.info("setting timeout");
							
							this_one_timeout = setTimeout(function() {
								
								this_one_timeout = null;
								
								Ti.Geolocation.removeEventListener("location", wifi_only_callback);
								
								if (androidisgpson.getGPSState()) {
									
									Ti.UI.createNotification({
									    message: "Trying again using GPS",
									    duration: Ti.UI.NOTIFICATION_DURATION_LONG
									}).show();
									
									both_enabled();
									return;
								}
								
								var need_gps = Ti.UI.createAlertDialog({
									
									message: "Your phone needs GPS to detect your location. Go to Settings?",
									buttonNames: ["Yes", "Cancel"]
								});
								
								need_gps.addEventListener("click", function(e) {
									
									if (e.index === 0) {
										
										android_location_settings();
									}
								});
								
								need_gps.show();
								
								callback({
		                        	success: false
		                        });
								
							}, 8000);
						}
						
						createWIFIprovider();
						Ti.Geolocation.Android.manualMode = true;
						Ti.Geolocation.Android.addLocationProvider(wifiProvider);
						Ti.Geolocation.addEventListener("location", wifi_only_callback);
					}
				}	
			}

			function wifi_only_callback (e) {
				
				if (typeof e == "undefined" || !e || !e.coords) {
					
					Ti.API.info("event is null");
					return;
				}
				
				last_event = e;
				
				var age = seconds_since(e);
				
				var acc = Math.floor(e.coords.accuracy);
				
				
				Ti.API.info("wifi enabled only: accuracy " + acc + ", age: " + seconds_since(e) + " seconds");
				
				if (age < 10 && acc <= meters_accurate_enough) {
					
					if (this_one_timeout) clearTimeout(this_one_timeout);
					this_one_timeout = null;
					
					Ti.Geolocation.removeEventListener("location", wifi_only_callback);
				
					Ti.API.info("done! " + time_elapsed() + " seconds.");
					
					var ev = e.coords;
					ev.success = true;
					
					callback(ev);
				}
				
				else Ti.API.info("not done");
			}

			function just_gps() {
				
				while (!this_one_timeout) {
					
					Ti.API.info("setting timeout");
					
					this_one_timeout = setTimeout(function() {
						
						Ti.API.info("in the timeout!");
						
						this_one_timeout = null;
						
						Ti.Geolocation.removeEventListener("location", gps_only_callback);
						
						//var gps_enabled = androidisgpson.getGPSState();
						var networks = androidisgpson.getNetworkProviderState();
						var wifi = _.contains(["enabled", "enabling"], androidwifi2.getWifiState());
						
						if (!networks) {
							
							//dont tell them we're about to enable wifi
							var message = "Your phone needs Network Locating to detect your location. Enable?";
							var buttonNames = ["Yes, go to Settings", "Cancel"];

						}
							
						else {
							
							if (!wifi) {
								
								var message = "Your phone needs your Wi-Fi adapter to detect your location. Enable?";
								var buttonNames = ["Yes", "Cancel"];
							}
							
							else { //they turned it on part of the way through
								
								Ti.UI.createNotification({
								    message: "Trying again using Wi-Fi adapter",
								    duration: Ti.UI.NOTIFICATION_DURATION_LONG
								}).show();
								
								both_enabled();
								return;
							}
						} 
						
						var need_wifi = Ti.UI.createAlertDialog({
							
							message: message,
							buttonNames: buttonNames
						});
						
						need_wifi.addEventListener("click", function(e) {
							
							if (e.index === 0) {
								
								if (networks && !wifi) {
									
									enable_wifi();
									
									setTimeout(both_enabled, 0);
								}
								
								
								else if (!networks && !wifi) {
									
									enable_wifi();
									
									android_location_settings();
									
									callback({
			                        	success: false
			                        });
								}
								
								else if (!networks && wifi) {
							
									android_location_settings();
									
									callback({
			                        	success: false
			                        });
								}
								
								else { //networks and wifi both enabled - already exited
									
									
								}
							}
							
							else callback({success: false});
						});
						
						need_wifi.show();
						
					}, 8000);
				}
				
				createGPSprovider();
				Ti.Geolocation.Android.manualMode = true;
				Ti.Geolocation.Android.addLocationProvider(gpsProvider);
				Ti.Geolocation.addEventListener("location", gps_only_callback);
			}

			function gps_only_callback (e) {
				
				if (typeof e == "undefined" || !e || !e.coords) {
					
					Ti.API.info("event is null");
					return;
				}
				
				current_result = e;
				
				var age = seconds_since(e);
				var acc = Math.floor(e.coords.accuracy);
				
				Ti.API.info("gps enabled only: accuracy " + acc + ", age: " + seconds_since(e) + " seconds");
				
				if (age < 10 && acc <= meters_accurate_enough) {
					
					if (this_one_timeout) clearTimeout(this_one_timeout);
					this_one_timeout = null;
					
					Ti.Geolocation.removeEventListener("location", gps_only_callback);
				
					Ti.API.info("done! " + time_elapsed() + " seconds.");
					
					var ev = e.coords;
					ev.success = true;
					
					callback(ev);
				}
				
				else Ti.API.info("not done");
			}

			function both_enabled() {
				
				while (!this_one_timeout) {
					
					this_one_timeout = setTimeout(function() {
					
						this_one_timeout = null;
						
						if (interv) clearInterval(interv);
						interv = null;
						
						Ti.Geolocation.removeEventListener("location", both_enabled_callback);
						
						Ti.UI.createAlertDialog({
							
							message: "There was a problem with the location functionality of your phone. Please try again.",
							buttonNames: ["Dismiss"]
						}).show();
						
						callback({
                        	success: false,
                        	massive_location_failure: true
                        });
					
					}, 15000);
				}
				
				createGPSprovider();
				createWIFIprovider();
				Ti.Geolocation.Android.manualMode = true;
				switch_provider();
				Ti.Geolocation.addEventListener("location", both_enabled_callback);
			}

			function both_enabled_callback (e) {
				
				if (typeof e == "undefined" || !e || !e.coords) {
					
					Ti.API.info("event is null");
					return;
				}
				
				last_event = e;
				var age = seconds_since(e);
				var acc = Math.floor(e.coords.accuracy);
				
				Ti.API.info(e.provider.name);
				
				Ti.API.info("both enabled, using " + e.provider.name + " as " + using + ": accuracy " + acc + ", age: " + age + " seconds");
				
				if (age < 10 && acc <= meters_accurate_enough) {
					
					Ti.Geolocation.removeEventListener("location", both_enabled_callback);
					
					using = null;
					
					if (interv) clearInterval(interv);
					interv = null;
					
					if (this_one_timeout) clearTimeout(this_one_timeout);
					this_one_timeout = null;
				
					Ti.API.info("done! " + time_elapsed() + " seconds.");
					
					var ev = e.coords;
					ev.success = true;
					
					callback(ev);
				}
				
				else Ti.API.info("not done");
			}//both enabled callback
		} //android
		
		
		
		
		else if (OS_IOS)	{
			
			var appleWIFI = require("com.restado.appleWifi");

			var loc = null;
			
			var locations_returned = 0;
			
			var wified_readings = 0;
			
			var fail_count = 0;
			
			Titanium.Geolocation.addEventListener('location', check_location);
			Titanium.Geolocation.accuracy = Titanium.Geolocation.ACCURACY_BEST;
			
			function check_location(e) {
			
				Ti.Geolocation.removeEventListener("location", check_location);
				
				if (!(e && e.success)) {
					
				    if (fail_count < 10) {
				    	
    				    ++fail_count;
    				    Ti.Geolocation.addEventListener("location", check_location);
                        Titanium.Geolocation.accuracy = Titanium.Geolocation.ACCURACY_BEST;
                    
                        return;
                    }
                    
                    else {
                        
                    	
                    	Ti.UI.createAlertDialog({
                            message: "The location functionality on your phone is not working at the moment. Please try again.",
                            buttonNames: ["Dismiss"]
                        }).show();
                        
                        
                        callback({
                        	success: false,
                        	massive_location_failure: true
                        });
                                           
                        return;
                    }
                }
				
				loc = _.pick(e.coords, "latitude", "longitude", "accuracy");
				
				if (locations_returned == 0 ) { //first one likely stale
					
					++locations_returned;
					Titanium.Geolocation.addEventListener('location', check_location);
					Titanium.Geolocation.accuracy = Titanium.Geolocation.ACCURACY_BEST;
				}
				
				else {
					
					++locations_returned;
					
					if (loc.accuracy <= meters_accurate_enough) { //accurate enough reading.
										
						ev = loc;
						ev.success = true;
						
						callback(ev);
					}
					
					else {//inaccurate reading
						
						if (locations_returned < 10) {//keep going.
							
							Ti.Geolocation.addEventListener("location", check_location);
							Titanium.Geolocation.accuracy = Titanium.Geolocation.ACCURACY_BEST;
						}
						
						else {
							
							var wifi_status = appleWIFI.isWIFIEnabled();
							
							//disabled
							if (wifi_status == 0) {
								
								
								var dialog = Ti.UI.createAlertDialog({
									title: "Wi-Fi",
									message: "You have disabled Wi-Fi. At the moment," 
										+ " your Wi-Fi adapter must be on to find your location."
										+ " To enable, please go to Settings > Wi-Fi.",
									buttonNames: ["Dismiss"]	
								});
								
								dialog.show();						
								
								callback({
									success: false,
									need_wifi: true
								});
							}														
							
							//accuracy is bad, with iPhone 4S/old iPad; wifi state unknown.
							else if (wifi_status == 2) {
								
								if (!S_inform_obj.value) {
									
									var alertt = Ti.UI.createAlertDialog({
										title: "Wi-Fi",
										message: "At the moment, your Wi-Fi adapter must be on to find your location." 
														+ " To make sure Wi-Fi is on,"
														+ " please go to Settings > Wi-Fi.",
										buttonNames: ["Dismiss"]
									});
									
									alertt.show();
									
									S_inform_obj.value = true;
									
									callback({
										success: false,
										wifi_unknown: true
									});
								}
								
								//min 7
								else if (wified_readings < 6) {
									++locations_returned;
									++wified_readings;
									Ti.Geolocation.addEventListener("location", check_location);
									Titanium.Geolocation.accuracy = Titanium.Geolocation.ACCURACY_BEST;
								}
								else { //we did our best. and it wasn't good enough.
									
								
									var alertt = Ti.UI.createAlertDialog({
										message: "The location functionality on your phone is not working at the moment. Please try again.",
										buttonNames: ["Dismiss"]									
									});
									
									alertt.show();
									
									callback({
										success: false,
										massive_location_failure: true
									});
								}
							}
							
							//accuracy is bad, but Wi-Fi is on.
							else if (wifi_status == 1) {
								
								//min 7
								if (wified_readings < 6) {
									++locations_returned;
									++wified_readings;
									Ti.Geolocation.addEventListener("location", check_location);
									Titanium.Geolocation.accuracy = Titanium.Geolocation.ACCURACY_BEST;
								}
								else { //we did our best. end. do not send what we have.
									
									
									var alertt = Ti.UI.createAlertDialog({
										message: "The location functionality on your phone is not working at the moment. Please try again.",
										buttonNames: ["Dismiss"]									
									});
									
									alertt.show();
									
									callback({
										success: false,
										massive_location_failure: true
									});
								}
							}
						}//tried at least 10 times
					}//inaccurate reading					
				}//past the first reading				
			} //check location
		} //ios
	}//after permissions check
}//get_exact_location
						
			
			
exports.get_exact_location = get_exact_location;
