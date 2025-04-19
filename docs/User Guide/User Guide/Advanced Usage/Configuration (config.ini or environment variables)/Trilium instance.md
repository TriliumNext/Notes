# Trilium instance
A Trilium instance represents a server. If <a class="reference-link" href="../../Installation%20%26%20Setup/Synchronization.md">Synchronization</a> is set up, since multiple servers are involved (the one from the desktop client and the one the synchronisation is set up with), sometimes it can be useful to distinguish the instance you are running on.

## Setting the instance name

To set up a name for the instance, modify the `config.ini`:

```
[General]
instanceName=Hello
```

## Distinguishing the instance on back-end

Use `api.getInstanceName()` to obtain the instance name of the current server, as specified in the config file or in environment variables.

## Limiting script runs based on instance

For a script that is run periodically or on a certain event, it's possible to limit it to certain instances without having to change the code. Just add `runOnInstance` and set as the value the instance name where the script should run. To run on multiple named instances, simply add the label multiple times.