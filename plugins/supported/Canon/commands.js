/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

// TODO: How to we mark sub commands?

var rootCanon = require("Canon:directory").rootCanon;
var util = require("bespin:util/util");
var catalog = require("plugins").catalog;

var files = catalog.getObject("files");
var editor = catalog.getObject("editor");
var editSession = catalog.getObject("editSession");
var server = catalog.getObject("server");

/**
 * 'cmd load'
 */
exports.loadCommand = function(instruction, commandname) {
    if (!commandname) {
        instruction.addUsageOutput(this);
        return;
    }

    var project = files.userSettingsProject;
    var path = "commands/" + commandname + ".js";

    var onSuccess = function(file) {
        try {
            var command = eval(file.content);
            // Note: This used to allow multiple commands to be stored in
            // a single file, however that meant that the file was a (more)
            // butchered version of JSON - the contents of an array.
            rootCanon.addCommand(command);
        } catch (e) {
            instruction.addErrorOutput("Something is wrong about the command:<br><br>" + e);
        }
    };

    files.loadContents(project, path, onSuccess, true);
};

/**
 * 'cmd edit'
 */
exports.editCommand = function(instruction, commandname) {
    if (!commandname) {
        instruction.addUsageOutput(this);
        return;
    }

    var filename = "commands/" + commandname + ".js";
    var content = "" +
        "{\n" +
        "    name: '" + commandname + "',\n" +
        "    takes: [YOUR_ARGUMENTS_HERE],\n" +
        "    preview: 'execute any editor action',\n" +
        "    execute: function(self, args) {\n" +
        "\n" +
        "    }\n" +
        "}";

    editor.openFile(files.userSettingsProject, filename, {
        content: content,
        force: true
    });
};

/**
 * 'cmd list'
 */
exports.listCommand = function(instruction) {
    var project = files.userSettingsProject;
    server.list(project, 'commands/', function(commands) {
        if (!commands || commands.length < 1) {
            instruction.addOutput("You haven't installed any custom commands." +
                    "<br>Want to " +
                    "<a href='https://wiki.mozilla.org/Labs/Bespin/Roadmap/Commands'>" +
                    "learn how?</a>");
        } else {
            var output = "<u>Your Custom Commands</u><br/><br/>";

            var jsCommands = commands.filter(function(file) {
                return util.endsWith(file.name, '\\.js');
            });

            output += jsCommands.map(function(jsCommand) {
                return jsCommand.name.replace(/\.js$/, '');
            }).join("<br>");
            instruction.addOutput(output);
        }
    });
};

/**
 * 'cmd rm' command
 */
exports.deleteCommand = function(instruction, commandname) {
    if (!commandname) {
        instruction.addUsageOutput(this);
        return;
    }

    var project = files.userSettingsProject;
    var commandpath = "commands/" + commandname + ".js";

    var onSuccess = instruction.link(function() {
        if (editSession.checkSameFile(project, commandpath)) {
            // only clear if deleting the same file
            editor.model.clear();
        }
        instruction.addOutput('Removed command: ' + commandname);
    });

    var onFailure = instruction.link(function(xhr) {
        instruction.addOutput("Wasn't able to remove the command <b>" + commandname + "</b><br/><em>Error</em> (probably doesn't exist): " + xhr.responseText);
    });

    files.removeFile(project, commandpath, onSuccess, onFailure);
};