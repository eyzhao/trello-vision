/* global TrelloPowerUp */

// we can access Bluebird Promises as follows
var Promise = TrelloPowerUp.Promise;

/*

Trello Data Access

The following methods show all allowed fields, you only need to include those you want
They all return promises that resolve to an object with the requested fields

Get information about the current board
t.board('id', 'name', 'url', 'shortLink', 'members')

Get information about the current list (only available when a specific list is in context)
So for example available inside 'attachment-sections' or 'card-badges' but not 'show-settings' or 'board-buttons'
t.list('id', 'name', 'cards')

Get information about all open lists on the current board
t.lists('id', 'name', 'cards')

Get information about the current card (only available when a specific card is in context)
So for example available inside 'attachment-sections' or 'card-badges' but not 'show-settings' or 'board-buttons'
t.card('id', 'name', 'desc', 'due', 'closed', 'cover', 'attachments', 'members', 'labels', 'url', 'shortLink', 'idList')

Get information about all open cards on the current board
t.cards('id', 'name', 'desc', 'due', 'closed', 'cover', 'attachments', 'members', 'labels', 'url', 'shortLink', 'idList')

Get information about the current active Trello member
t.member('id', 'fullName', 'username')

*/

/*

Storing/Retrieving Your Own Data

Your Power-Up is afforded 4096 chars of space per scope/visibility
The following methods return Promises.

Storing data follows the format: t.set('scope', 'visibility', 'key', 'value')
With the scopes, you can only store data at the 'card' scope when a card is in scope
So for example in the context of 'card-badges' or 'attachment-sections', but not 'board-badges' or 'show-settings'
Also keep in mind storing at the 'organization' scope will only work if the active user is a member of the team

Information that is private to the current user, such as tokens should be stored using 'private'

t.set('organization', 'private', 'key', 'value');
t.set('board', 'private', 'key', 'value');
t.set('card', 'private', 'key', 'value');

Information that should be available to all users of the Power-Up should be stored as 'shared'

t.set('organization', 'shared', 'key', 'value');
t.set('board', 'shared', 'key', 'value');
t.set('card', 'shared', 'key', 'value');

If you want to set multiple keys at once you can do that like so

t.set('board', 'shared', { key: value, extra: extraValue });

Reading back your data is as simple as

t.get('organization', 'shared', 'key');

Or want all in scope data at once?

t.getAll();

*/

var PROJECT_CHECKLIST_NAME = 'Project Next Actions (Automated)'
var AWS_URL = 'https://3ltq8541yg.execute-api.us-west-1.amazonaws.com/dev'

var authorizeApplication = function(t) {
  console.log('authorizing')
  
  var authenticationSuccess = function() { console.log('Successful authentication'); };

  var authenticationFailure = function() { console.log('Failed authentication'); };

  Trello.authorize({
    type: 'popup',
    name: 'Getting Started Application',
    scope: {
      read: 'true',
      write: 'true' },
    expiration: 'never',
    success: authenticationSuccess,
    error: authenticationFailure
  });  
}

var getTaskData = function(taskId) {
  return new Promise((resolve, reject) => {
    var http = new XMLHttpRequest();
    var url = AWS_URL + '/tasks/' + taskId

    http.open('GET', url, true)
    
    http.onload = () => {
        if (http.status >= 200 && http.status < 300) {
            resolve(JSON.parse(http.response));
        } else {
            reject(http.statusText);
        }
    };
    
    http.send();
  });
}

var getBoardData = function(boardId) {
  return new Promise((resolve, reject) => {
    var http = new XMLHttpRequest();
    var url = AWS_URL + '/boards/' + boardId

    http.open('GET', url, true)
    
    http.onload = () => {
        if (http.status >= 200 && http.status < 300) {
            resolve(JSON.parse(http.response));
        } else {
            reject(http.statusText);
        }
    };
    
    http.send();
  });
}

var setTaskData = function(taskId, taskUrl, projectId, projectUrl, projectName, boardId) {
  return new Promise((resolve, reject) => {
    var http = new XMLHttpRequest();
    var url = AWS_URL + '/tasks'

    http.open('POST', url, true)
    http.setRequestHeader('Content-type', 'application/json');

    http.onload = () => {
          if (http.status >= 200 && http.status < 300) {
              resolve('done');
          } else {
              reject(http.statusText);
          }
    };

    http.send(JSON.stringify({
      taskId: taskId,
      taskUrl: taskUrl,
      projectId: projectId,
      projectUrl: projectUrl,
      projectName: projectName,
      boardId: boardId
    }));
  })
}

var getBadges = function(t, project_data){
  return t.card('id')
  .get('id')
  .then(card_id => {
    for (var obj of project_data) {
      if (obj.taskId == card_id) {
        return [{
      // card detail badges (those that appear on the back of cards)
      // also support callback functions so that you can open for example
      // open a popup on click
          title: 'Project', // for detail badges only
          text: obj.projectName,
          callback: cardButtonCallback,
        }];
      }
    }
    
    return [{
      // card detail badges (those that appear on the back of cards)
      // also support callback functions so that you can open for example
      // open a popup on click
          title: 'Project', // for detail badges only
          text: 'None',
          callback: cardButtonCallback,
    }];
  })
};

var goToProjectCallback = function(t) {
  t.card('id')
  .get('id')
  .then(id => {
    return(getTaskData(id))
  })
  .then(task_data => {
    return(task_data[0]['projectUrl'])
  })
  .then(project_url => {
    window.open(project_url)
  })
}

var cardButtonCallback = function(t){
  // Trello Power-Up Popups are actually pretty powerful
  // Searching is a pretty common use case, so why reinvent the wheel

  var success = function(successMsg) {
    console.log('Read project cards successfully');
  };

  var error = function(errorMsg) {
    console.log(errorMsg);
  };
  
  Trello.authorize();
  
  var project_promise = t.get('board', 'private', 'my-project-boards')
  .then(project_boards => {
    return Promise.all(
      project_boards.map(board => {
        Trello.authorize();    
        return Trello.get(`/boards/${board}/cards`)
      })
    )
  })
  .then(data => {
    return Promise.all([
      t.card('id').get('id'),
      t.card('url').get('url'),
      t.board('id').get('id'),
      [].concat.apply([], data) // Flattens arrays into a single array
    ])
  })
  .then(data => {
    var card_id = data[0]
    var card_url = data[1]
    var board_id = data[2]
    var project_data = data[3]
    return project_data
      .map(project_card => {
        return {
          text: project_card.name,
          url: project_card.url,         
          callback: function(t) {
              setTaskData(card_id, 
                          card_url,
                          project_card.id, 
                          project_card.url, 
                          project_card.name,
                          board_id)
              return t.closePopup();
          }
        }
      })
  })
  .then(display_cards => {
    return t.popup({
    title: 'Popup Search Example',
    items: display_cards, // Trello will search client side based on the text property of the items
    search: {
      count: 5, // how many items to display at a time
      placeholder: 'Search National Parks',
      empty: 'No parks found'
    }
    })
  })
  
  return(project_promise)
};

var getProjectAssignedCards = function(t, data) {
  // Returns all cards which have been assigned to projects
  // param data: output of t.getAll()
  return Object.keys(data.organization.shared)
    .filter(key => {
      return key.startsWith('prj-')
    })
    .filter(key => {
      var project_obj = data.organization.shared[key]
      return project_obj.hasOwnProperty('id') && project_obj.hasOwnProperty('url') && project_obj.hasOwnProperty('name') 
    })
    .map(key => {
      return data.organization.shared[key]
  })
}

var getProjectCards = function(t) {
  Trello.authorize()
  return t
    .getAll()
    .then(data => {
      var project_card_getter = getProjectAssignedCards(t, data)
        .map(project_obj => {
          return Trello.get(`/cards/${project_obj.id}`)
        })
      return Promise.all(project_card_getter)
    })
}

var updateProjectChecklists = function(t) {
  return new Promise((resolve, reject) => {
    var http = new XMLHttpRequest();
    var url = AWS_URL + '/update'

    http.open('GET', url, true)
    
    http.onload = () => {
        if (http.status >= 200 && http.status < 300) {
            resolve(http.response);
        } else {
            reject(http.statusText);
        }
    };
    
    http.send();
  });
}

// We need to call initialize to get all of our capability handles set up and registered with Trello

var run = function() {
  getBoardData('57f98b2ec2956233649b0873').then(project_data => {
    TrelloPowerUp.initialize({
      // NOTE about asynchronous responses
      // If you need to make an asynchronous request or action before you can reply to Trello
      // you can return a Promise (bluebird promises are included at TrelloPowerUp.Promise)
      // The Promise should resolve to the object type that is expected to be returned
      'authorization-status': function(t, options){
        // return a promise that resolves to the object with
        // a property 'authorized' being true/false
        // you can also return the object synchronously if you know the answer synchronously
        return new TrelloPowerUp.Promise((resolve) => resolve({ authorized: true }));
      },
      'board-buttons': function(t, options){
        return [{
          // we can either provide a button that has a callback function
          // that callback function should probably open a popup, overlay, or boardBar
          //icon: WHITE_ICON,
          text: 'Update Project Next Actions',
          callback: updateProjectChecklists
        }, {
          text: 'Authorize',
          callback: authorizeApplication
        }];
      },
      'card-badges': function(t, options){
        return getBadges(t, project_data);
      },
      'card-buttons': function(t, options) {
        return [{
          // usually you will provide a callback function to be run on button click
          // we recommend that you use a popup on click generally
          //icon: GRAY_ICON, // don't use a colored icon here
          text: 'Go to Project',
          callback: goToProjectCallback
        }];
      },
      'card-detail-badges': function(t, options) {
        return getBadges(t, project_data);
      },
      'show-authorization': function(t, options){
        // return what to do when a user clicks the 'Authorize Account' link
        // from the Power-Up gear icon which shows when 'authorization-status'
        // returns { authorized: false }
        // in this case we would open a popup
        return t.popup({
          title: 'My Auth Popup',
          url: './authorize.html', // this page doesn't exist in this project but is just a normal page like settings.html
          height: 140,
        });
      },
      'show-settings': function(t, options){
        // when a user clicks the gear icon by your Power-Up in the Power-Ups menu
        // what should Trello show. We highly recommend the popup in this case as
        // it is the least disruptive, and fits in well with the rest of Trello's UX
        return t.popup({
          title: 'Settings',
          url: './settings.html',
          height: 184 // we can always resize later, but if we know the size in advance, its good to tell Trello
        });
      }
    });
  })
}

run()
console.log('Loaded by: ' + document.referrer);