---
title: Godot4 w/ C# in VSCode setup
date: 2024-06-16T16:20:41.000Z
description: >-
  Complete setup guide for developing Godot 4 games with C# in VS Code,
  including debugging configuration and required extensions.
tags:
  - godot
  - dev-setup
readTime: 2
keywords: []
faq:
  - q: "How do you set up Godot 4 with C# in VS Code?"
    a: "Install the Godot .NET engine and .NET SDK, add the C#, C# Dev Kit, and C# Tools for Godot extensions in VS Code, configure a main scene in Godot project settings, set VS Code as the external editor, and add launch.json and tasks.json files."
  - q: "How do you debug a Godot 4 C# project in VS Code?"
    a: "Create a .vscode folder with launch.json and tasks.json configurations that use the coreclr debugger type. Set a GODOT4 environment variable pointing to your Godot executable, then use the Launch configuration to run and debug."
  - q: "What is the GODOT4 environment variable for?"
    a: "The GODOT4 environment variable stores the path to your Godot executable. The VS Code launch.json references it so the debugger knows which Godot binary to run your project with."
---

I spent some time trying to set up my dev environement to be able to run and debug a Godot game written in .Net inside VSCode.
Here are the steps I took to setup:

1. Install Godot Engine for **.Net** [Link](https://godotengine.org/download/macos/)
2. Install .Net SDK [Link](https://dotnet.microsoft.com/en-us/download)
3. Go into VSCode and install the following extensions
    * .NET Install Tool
    * C#
    * C# Dev Kit
    * C# Tools for Godot
4. In the Godot Engine, click on **Project** -> **Project Settings**, then on the sidebar under **Application**, click on **Run** and set a main scene.

![Godot 4 project settings showing the main scene configuration under Application > Run](../setting-up-godot4-csharp-vscode/project_settings.png)

5. In the Godot Engine, click on **Editor** -> **Editor Settings**, then scroll down on the sidebar, under **Dotnet** click on **Editor**, and change the external editor to VSCode.

![Godot 4 editor settings showing external editor set to VSCode under Dotnet > Editor](../setting-up-godot4-csharp-vscode/editor_settings.png)

6. Open your project in VSCode, you will need to add two files in order to debug and run your game from VSCode.
Create a `.vscode` folder, with two files, `launch.json` and `tasks.json`

launch.json:

```json
{
    "version": "2.0.0",
    "configurations": [
        {
            "name": "Launch",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "build",
            "program": "{env:GODOT4}",
            "cwd": "${workspaceFolder}",
            "console": "internalConsole",
            "stopAtEntry": false,
            "args": [
                "--path",
                "${workspaceRoot}"
            ]
        },
        {
            "name": "Launch (Select Scene)",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "build",
            "program": "{env:GODOT4}",
            "cwd": "${workspaceFolder}",
            "console": "internalConsole",
            "stopAtEntry": false,
            "args": [
                "--path",
                "${workspaceRoot}",
                "${command:godot.csharp.getLaunchScene}"
            ]
        },
        {
            "name": "Launch Editor",
            "type": "coreclr",
            "request": "launch",
            "preLaunchTask": "build",
            "program": "{env:GODOT4}",
            "cwd": "${workspaceFolder}",
            "console": "internalConsole",
            "stopAtEntry": false,
            "args": [
                "--path",
                "${workspaceRoot}",
                "--editor"
            ]
        },
        {
            "name": "Attach to Process",
            "type": "coreclr",
            "request": "attach"
        }
    ]
}
```

and tasks.json:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "build",
            "command": "dotnet",
            "type": "shell",
            "args": [
                "build",
                "/property:GenerateFullPaths=true",
                "/consoleloggerparameters:NoSummary"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "presentation": {
                "reveal": "silent"
            },
            "problemMatcher": "$msCompile"
        }
    ]
}
```

7. Create a new environment variable called `GODOT4`, with its value being the path to your godot executable.
In my case, on a mac, this was the correct path `/Users/eliranturgeman/Downloads/Godot_mono.app/Contents/MacOS/Godot`

---

This might be a beginning of a "dev log" kind of a series, or a one time thing, nobody knows.




