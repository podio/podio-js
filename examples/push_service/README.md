# Podio Push Service Example

A simple example script that demonstrates using podio-js to subscribe to Podio's real-time push service.

It works be creating two instances of the SDK and logging a different user in to each of them.
User #1 subscribes to push events for new unread notifications and user #2 then assigns a task to user #1, thereby triggering a notification to be sent to user #1.

We verify that we receive this notification and then exits the script.

# Installation

```
npm install
```

# Configuration
First, you will need to create two users in podio and ensure that they have access to the same workspace.

Then place a config file in the root of the ```push_service/``` folder and give it the following contents:
```
{
  "clientId": "[YOUR CLIENT ID]",
  "clientSecret": "[YOUR CLIENT SECRET]",
  "user1": {
    "username": "[USER 1 EMAIL]",
    "password": "[USER 1 PASSWORD]"
  },
  "user2": {
    "username": "[USER 2 EMAIL]",
    "password": "[USER 2 PASSWORD]"
  }
}
```
Replacing the square bracket fields with your relavant information, of course.

# Run

```
npm start
```

This script won't start a server, but rather log its output to the console.

# Documentation
To learn more about Podio's push services and information about how to use different carrier objects to listen for different events, please refer to the following resource:
- [Working with Podio's push service](https://developers.podio.com/examples/push)
