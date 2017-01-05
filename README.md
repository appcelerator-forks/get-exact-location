# get-exact-location
A Titanium CommonJS module for both Android and iOS. Gives you the user's exact location. Handles permissions and stuff by itself.

It requires some of my native modules which you can find in my repositories, specifically these:

For checking the state of the Wi-Fi adapter on iPhone:
https://github.com/dommccarty/apple-wifi

For checking and changing the state of the Wi-Fi adapter on Android:
https://github.com/dommccarty/androidwifi2

For taking the user to the OS app settings page so they can give a permission they refused:
https://github.com/dommccarty/android-app-settings

For checking if the location functionality of the phone is enabled on Android:
https://github.com/dommccarty/android-location-provider-states


Example usage:

```
var meters_accurate_enough = 65;
var app_name = "Restado",
var what_the_action_is = "see how close you are to a delicious restaurant";
var S_inform_obj = {value: false};
var callback = function(e) {

  if (e.success) {
  
    Ti.API.info("User located. Latitude is " +
                  e.latitude + ", longitude is " + 
                  e.longitude + ", accuracy is " + 
                  e.accuracy" + ".");
                  
    //do whatever you need to do with this information
  }
};

get_exact_location(meters_accurate_enough, app_name, what_the_action_is, S_inform_obj, callback);
```

The function stops if it gets a reading which has (in)accuracy less than what you specify.
It uses the app name and a description of why you're taking a reading to explain to the user why they should 
perform some action you need them to perform (enabling locating services, granting permission, turning on their Wi-Fi adapter).

The fourth argument is just a dictionary which is used in case the method used in the ```apple-wifi``` module
fails to tell if the user's Wi-Fi adapter is on or off. We may need the adapter to be on to get a sufficiently accurate reading.
The dictionary stores whether or not we have told them that their Wi-Fi adapter should be on. This only seems to be an issue
with the iPhone 4S. With newer devices, we can tell if the Wi-Fi is on or off. But the fourth
argument must always be supplied in the manner above, anyway.

This module checks to see if your app has the necessary permission. If it does, it proceeds. If not, it asks for permission, 
and proceeds if permission is granted.

If permission has been previously requested, it offers to take the user to the OS's settings page for the app so they can 
authorize after all.

If permission is granted, it proceeds to try to get the location. For iOS, if it has trouble, it will check to see if the 
Wi-Fi adapter is on, and if not, ask the user to turn it on, telling them how.

For Android, it checks to see what locating hardware is enabled (GPS, Wi-Fi, and Network Provider). It handles the cases that
all or only some are allowed, and if it needs more it will ask for more. It can turn on Wi-Fi if the user says they allow it.
It can take them to the Location Settings page of the OS if need be. Assuming the ideal situation that GPS and Wi-Fi are both
enabled, it will switch back and forth between the two until it gets an accurate reading or runs out of time (the time is
specified inside the function and you can easily change it).

The best thing as far as Android is concerned is that this module
doesn't require a native module built using the Play Services SDK. I previously used a module I built which used the 
Fused Location Provider and worked great, but Appcelerator doesn't handle modules built with the Play Services well - your app
can't use modules built with different versions of the Play Services SDK, and it seems impossible to build modules
using the latest versions of that SDK. So I do without it. The good news is that this CommonJS module works just as well as
the native module I built before with the Fused Location Provider! Yay.
