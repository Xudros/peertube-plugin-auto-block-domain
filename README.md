# Auto Domain video blocker
Auto block domain import plugin for PeerTube

This plugin takes set domains that you type into the plugin settings like this
```
www.example1.com,www.example2.com,www.example3.com
```
And when someone imports a video it checks the domain used in the import and compares it to the domains saved in the settings, if they match it continues with the import, if not it blocks the video from being imported by setting the validation of the import to false so admins wont have to worry about it still being downloaded but blocked.
