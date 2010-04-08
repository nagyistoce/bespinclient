/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

//var console = require('bespin:console').console;
var server = require('bespin_server').server;
var cliController = require('command_line:controller').cliController;


/**
 * Helper for when you have a command that needs to get a hold of it's params
 * as an array for processing.
 * TODO: I'm fairly sure there is a better way to do this knowing how command
 * line parsing works
 */
function toArgArray(args) {
    if (args === null) {
        return [];
    }
    else {
        var spliten = args.split(' ');
        if (spliten.length === 1 && spliten[0] === '') {
            return [];
        }
        else {
            return spliten;
        }
    }
};

// =============================================================================

/**
 * Add a 'follow' command that gets and adds to out list of our followers
 */
exports.followCommand = function(env, args, request) {
    var usernames = toArgArray(args.usernames);
    if (usernames.length === 0) {
        follow([], {
            evalJSON: true,
            onSuccess: function(followers) {
                if (!followers || followers.length === 0) {
                    request.done('You are not following anyone');
                    return;
                }

                var parent = exports.displayFollowers(followers);
                request.done(parent);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to retrieve followers: ' +
                        xhr.responseText);
            }
        });
    }
    else {
        follow(usernames, {
            evalJSON: true,
            onSuccess: function(followers) {
                if (!followers || followers.length === 0) {
                    request.done('You are not following anyone');
                    return;
                }

                var parent = exports.displayFollowers(followers);
                request.done(parent);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to add follower: ' +
                        xhr.responseText);
            }
        });
    }
};

/**
 * follow / followers methods
 */
function follow(usernames, opts) {
    var body = JSON.stringify(usernames);
    server.request('POST', '/network/follow/', body, opts);
};

/**
 * Utility to take an string array of follower names, and publish a
 * "Following: ..." message as a command line response.
 */
exports.displayFollowers = function(followers) {
    var parent = document.createElement('div');
	var child  = document.createElement('div');
	child.innerHTML = 'You are following these users:';
	parent.appendChild(child);
	var table = document.createElement('table');
	parent.appendChild(table);
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);
    followers.forEach(function(follower) {
		var row = document.createElement('tr');
		tbody.appendChild(row);
		var cell = document.createElement('td');
		row.appendChild(cell);
		var img = document.createElement('img');
		img.src = '/images/collab_icn_user.png';
		img.width  = '16';
		img.height = '16';
		cell.appendChild(img);
		cell = document.createElement('td');
		cell.innerHTML = follower;
		row.appendChild(cell);
        // TODO: Add the users status information in here
		cell = document.createElement('td');
		row.appendChild(cell);
		var a = document.createElement('a');
		a.innerHTML = '<small>(unfollow)</small>';
		// TODO: use better way to attach an event handler
		a.onclick = function () {
			cliController.executeCommand('unfollow ' + follower);
		};
		cell.appendChild(a);
    });
    return parent;
};

// =============================================================================

/**
 * Add an 'unfollow' command that removes from our list of our followers
 */
exports.unfollowCommand = function(env, args, request) {
    var usernames = toArgArray(args.usernames);
    if (usernames.length === 0) {
        request.doneWithError('Please specify the users to cease following');
    }
    else {
        unfollow(usernames, {
            evalJSON: true,
            onSuccess: function(followers) {
                if (!followers || followers.length === 0) {
                    request.done('You are not following anyone');
                    return;
                }

                var parent = exports.displayFollowers(followers);
                request.done(parent);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to remove follower: ' +
                        xhr.responseText);
            }
        });
    }
};

/**
 * unfollow method
 */
function unfollow(users, opts) {
    server.request('POST', '/network/unfollow/', JSON.stringify(users), opts);
};

// =============================================================================

/**
 * Add an 'broadcast' command that sends a message to our followers
 */
exports.broadcastCommand = function(env, args, request) {
	broadcast(args.message || '', {
		evalJSON: true,
		onSuccess: function(followers) {
			if (!followers || followers.length === 0) {
				request.done('You are not following anyone');
				return;
			}

			var parent = exports.displayFollowers(followers);
			request.done(parent);
		},
		onFailure: function(xhr) {
			request.doneWithError('Failed to broadcast to followers: ' +
					xhr.responseText);
		}
	});
};

/**
 * broadcast method
 */
function broadcast(text, opts) {
    server.request('POST', '/network/broadcast/', JSON.stringify({text: text}), opts);
};

// =============================================================================

/**
 * 'group list' subcommand.
 */
exports.groupListCommand = function(env, args, request) {
    if (!args.group) {
        // List all groups
        groupListAll({
            evalJSON: true,
            onSuccess: function(groups) {
				createGroupListDisplay(groups, env, args, request);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to retrieve groups: ' +
                        xhr.responseText);
            }
        });
    } else {
        // List members in a group
        groupList(args.group, {
            evalJSON: true,
            onSuccess: function(members) {
				createMemberListDisplay(members, env, args, request);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to retrieve group members: ' +
                        xhr.responseText);
            }
        });
    }
};

/**
 * Helper to create a tabular display of groups.
 */
function createGroupListDisplay (groups, env, args, request) {
	if (!groups || groups.length === 0) {
		request.done('You have no groups');
		return;
	}

	var parent = document.createElement('div');
	var div = document.createElement('div');
	div.innerHTML = 'You have the following groups:';
	parent.appendChild(div);
	var table = document.createElement('table');
	parent.appendChild(table);
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);
	groups.forEach(function(group) {
		var row = document.createElement('tr');
		tbody.appendChild(row);
		var cell = document.createElement('td');
		row.appendChild(cell);
		var img = document.createElement('img');
		img.src = '/images/collab_icn_group.png';
		img.width = 16;
		img.height = 16;
		cell.appendChild(img);
		cell = document.createElement('td');
		cell.innerHTML = group;
		row.appendChild(cell);
		// TODO: Add the users status information in here
		cell = document.createElement('td');
		row.appendChild(cell);
		var a = document.createElement('a');
		a.innerHTML = '<small>(remove)</small>';
		// TODO: use better way to attach an event handler
		a.onclick = function () {
			cliController.executeCommand('group remove ' + group);
		};
		cell.appendChild(a);
		var span = document.createElement('span');
		span.innerHTML = '&nbsp;';
		cell.appendChild(span);
		a = document.createElement('a');
		a.innerHTML = '<small>(list)</small>';
		// TODO: use better way to attach an event handler
		a.onclick = function () {
			cliController.executeCommand('group list ' + group);
		};
		cell.appendChild(a);
	});

	request.done(parent);
};

/**
 * Helper to create a tabular member display.
 */
function createMemberListDisplay (members, env, args, request) {
	if (!members || members.length === 0) {
		request.done(args.group + ' has no members.');
		return;
	}

	var parent = document.createElement('div');
	var div = document.createElement('div');
	div.innerHTML = 'Members of ' + args.group + ':';
	parent.appendChild(div);
	var table = document.createElement('table');
	parent.appendChild(table);
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);

	members.forEach(function(member) {
		var row = document.createElement('tr');
		tbody.appendChild(row);
		var cell = document.createElement('td');
		row.appendChild(cell);
		var img = document.createElement('img');
		img.src = '/images/collab_icn_user.png';
		img.width = 16;
		img.height = 16;
		cell.appendChild(img);
		cell = document.createElement('td');
		cell.innerHTML = member;
		row.appendChild(cell);
		// TODO: Add the users status information in here
		cell = document.createElement('td');
		row.appendChild(cell);
		var a = document.createElement('a');
		a.innerHTML = '<small>(ungroup)</small>';
		// TODO: use better way to attach an event handler
		a.onclick = function () {
			cliController.executeCommand('group remove ' +
					args.group + ' ' + member);
		};
		cell.appendChild(a);
	});

	request.done(parent);
};

/**
 * 'group add' subcommand.
 */
exports.groupAddCommand = function(env, args, request) {
    var group = args.group;
    var members = toArgArray(args.members);
    groupAdd(group, members, {
        onSuccess: function(data) {
            request.done('Added to group "' + group + '": ' + members.join(', '));
        },
        onFailure: function(xhr) {
            request.doneWithError('Failed to add to group members. Maybe due to: ' +
                    xhr.responseText);
        }
    });
};

/**
 * 'group remove' subcommand.
 */
exports.groupRemoveCommand = function(env, args, request) {
    var group = args.group;
    var members = toArgArray(args.members);
    if (members.length === 1 && members[0] === 'all') {
        groupRemoveAll(group, {
            onSuccess: function(data) {
                request.done('Removed group ' + group);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to retrieve group members. Maybe due to: ' +
                        xhr.responseText);
            }
        });
    } else {
        // Remove members from a group
        groupRemove(group, members, {
            onSuccess: function(data) {
                request.done('Removed from group "' + group + '": ' + members.join(', '));
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to remove to group members. Maybe due to: ' +
                        xhr.responseText);
            }
        });
    }
};

/**
 * Get a list of the users the current user is following
 */
function groupListAll(opts) {
    server.request('GET', '/group/list/all/', null, opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupList(group, opts) {
    var url = '/group/list/' + group + '/';
    server.request('GET', url, null, opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupRemove(group, users, opts) {
    var url = '/group/remove/' + group + '/';
    server.request('POST', url, JSON.stringify(users), opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupRemoveAll(group, opts) {
    var url = '/group/remove/all/' + group + '/';
    server.request('POST', url, null, opts);
};

/**
 * Get a list of the users the current user is following
 */
function groupAdd(group, users, opts) {
    var url = '/group/add/' + group + '/';
    server.request('POST', url, JSON.stringify(users), opts);
};

// =============================================================================

/**
 * 'share list' sub-command.
 */
exports.shareListCommand = function(env, args, request) {
    var self = this;
    shareListAll({
        evalJSON: true,
        onSuccess: function(shares) {
            // Filter by project name if we have one
            if (args.project && args.project != '') {
                shares = shares.filter(function(share) {
                    return share.project == project;
                });
            }
            createShareDisplayElement(shares, env, args, request);
        },
        onFailure: function(xhr) {
            request.doneWithError('Failed to list project shares: ' +
                    xhr.responseText);
        }
    });
};

/**
 * Helper function to create a tabular display of shared projects
 */
function createShareDisplayElement (shares, env, args, request) {
    if (!shares || shares.length === 0) {
		request.done('You are not sharing any projects');
		return;
    }

	var parent = document.createElement('div');
	var div = document.createElement('div');
	div.innerHTML = 'You have the following shared projects:';
	parent.appendChild(div);
	var table = document.createElement('table');
	parent.appendChild(table);
	var tbody = document.createElement('tbody');
	table.appendChild(tbody);

    var lastProject = '';
    shares.forEach(function(share) {
		var row = document.createElement('tr'), cell;
		tbody.appendChild(row);

        if (share.project !== lastProject) {
			cell = document.createElement('th');
			row.appendChild(cell);
			var img = document.createElement('img');
			img.src = '/images/collab_icn_project.png';
			img.width = 16;
			img.height = 16;
			cell.appendChild(img);

			cell = document.createElement('th');
			cell.innerHTML = share.project;
			row.appendChild(cell);
        } else {
			cell = document.createElement('th');
			row.appendChild(cell);
			cell = document.createElement('th');
			row.appendChild(cell);
        }

        var withWhom;
        if (share.type == 'everyone') {
            withWhom = 'with everyone';
        }
        else if (share.type == 'group') {
            withWhom = 'with the group ' + share.recipient;
        }
        else {
            withWhom = 'with ' + share.recipient;
        }
		cell = document.createElement('td');
		cell.innerHTML = withWhom;
		row.appendChild(cell);

        var edit = share.edit ? 'Editable' : 'Read-only';
		cell = document.createElement('td');
		cell.innerHTML = edit;
		row.appendChild(cell);

        // TODO: loadany needs adding here when we add the feature in

		cell = document.createElement('td');
		row.appendChild(cell);
		var a = document.createElement('a');
		a.innerHTML = '<small>(unshare)</small>';
		// TODO: use better way to attach an event handler
		a.onclick = function () {
			cliController.executeCommand('share remove ' + share.project);
		};
		cell.appendChild(a);
    });

    request.done(parent);
};

/**
 * 'share remove' sub-command.
 */
exports.shareRemoveCommand = function(env, args, request) {
    if (!args.project || args.project == '') {
        request.doneWithError('Missing project.<br/>Syntax: share remove project [{user}|{group}|everyone]');
    }

    if (!args.member || args.member == '') {
        shareRemoveAll(args.project, {
            onSuccess: function(data) {
                request.done('All sharing removed from ' + args.project);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to remove sharing permissions. Maybe due to: ' +
                        xhr.responseText);
            }
        });
    } else {
        shareRemove(args.project, args.member, {
            onSuccess: function(data) {
                request.done('Removed sharing permission from ' + args.member +
                        ' to ' + args.project);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to remove sharing permission. Maybe due to: ' +
                        xhr.responseText);
            }
        });
    }
};

/**
 * 'share add' sub-command.
 */
exports.shareAddCommand = function(env, args, request) {
    if (!args.project || args.project == '') {
        request.doneWithError('Missing project.<br/>Syntax: share add project {user}|{group}|everyone [edit]');
    }

    if (!args.member || args.member == '') {
        request.doneWithError('Missing user/group.<br/>Syntax: share add project {user}|{group}|everyone [edit]');
    }

    shareAdd(args.project, args.member, args.permission || '', {
        onSuccess: function(data) {
            request.done('Adding sharing permission for ' + args.member +
                    ' to ' + args.project);
        },
        onFailure: function(xhr) {
            request.doneWithError('Failed to add sharing permission. Maybe due to: ' +
                    xhr.responseText);
        }
    });
};

/**
 * List all project shares
 */
function shareListAll(opts) {
    server.request('GET', '/share/list/all/', null, opts);
};

/**
 * List sharing for a given project
 */
function shareListProject(project, opts) {
    var url = '/share/list/' + project + '/';
    server.request('GET', url, null, opts);
};

/**
 * List sharing for a given project and member
 */
function shareListProjectMember(project, member, opts) {
    var url = '/share/list/' + project + '/' + member + '/';
    server.request('GET', url, null, opts);
};

/**
 * Remove all sharing from a project
 */
function shareRemoveAll(project, opts) {
    var url = '/share/remove/' + project + '/all/';
    server.request('POST', url, null, opts);
};

/**
 * Remove project sharing from a given member
 */
function shareRemove(project, member, opts) {
    var url = '/share/remove/' + project + '/' + member + '/';
    server.request('POST', url, null, opts);
};

/**
 * Add a member to the sharing list for a project
 */
function shareAdd(project, member, options, opts) {
    var url = '/share/add/' + project + '/' + member + '/';
    server.request('POST', url, JSON.stringify(options), opts);
};

// =============================================================================

/**
 * Add a 'viewme' command to allow people to screencast
 */
exports.viewmeCommand = function (env, args, request) {
    args = toArgArray(args.varargs);

    if (args.length === 0) {
        // === List all the members with view settings on me ===
        // i.e. 'viewme'
        viewmeListAll({
            onSuccess: function(data) {
                request.done('All view settings: ' + data);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to retrieve view settings. Maybe due to: ' +
                        xhr.responseText);
            }
        });
    }
    else if (args.length === 1) {
        // === List the view settings for a given member ===
        // i.e. 'viewme {user|group}'
        var member = args[0];
        viewmeList(member, {
            onSuccess: function(data) {
                request.done('View settings for ' + member + ': ' + data);
            },
            onFailure: function(xhr) {
                request.doneWithError('Failed to retrieve view settings. Maybe due to: ' +
                        xhr.responseText);
            }
        });
    }
    else if (args.length === 2) {
        if (args[1] != 'false' && args[1] != 'true' && args[1] != 'default') {
            _syntaxError('Valid viewme settings are {true|false|deafult}');
        }
        else {
            // === Alter the view setting for a given member ===
            var member = args[0];
            var value = args[1];
            viewmeSet(member, value, {
                onSuccess: function(data) {
                    request.done('Changed view settings for ' + member);
                },
                onFailure: function(xhr) {
                    request.doneWithError('Failed to change view setttings. Maybe due to: ' +
                            xhr.responseText);
                }
            });
        }
    }
    else {
        _syntaxError('Too many arguments. Maximum 2 arguments to "viewme" command.');
    }
};

function _syntaxError (message) {
    request.doneWithError('Syntax error - viewme ({user}|{group}|everyone) (true|false|default)');
};

/**
 * List all the members with view settings on me
 */
function viewmeListAll (opts) {
    server.request('GET', '/viewme/list/all/', null, opts);
};

/**
 * List the view settings for a given member
 */
function viewmeList (member, opts) {
    var url = '/viewme/list/' + member + '/';
    server.request('GET', url, null, opts);
};

/**
 * Alter the view setting for a given member
 */
function viewmeSet (member, value, opts) {
    var url = '/viewme/set/' + member + '/' + value + '/';
    server.request('POST', url, null, opts);
};
