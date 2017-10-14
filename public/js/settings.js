/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;
var t = TrelloPowerUp.iframe();

document.getElementById('savebutton').addEventListener('click', function(){
  var selected_boards = $('.projectboard:checked').map(function() {
    return $(this).val();
  }).get()
  console.log(selected_boards)
  return t.set('board', 'private', 'my-project-boards', selected_boards)
  .then(function(){
    t.closePopup();
  })
})

authenticate = function() {
  var authenticationSuccess = function() { console.log('Successful authentication'); };

  var authenticationFailure = function() { console.log('Failed authentication'); };

  Trello.authorize({
    type: 'redirect',
    name: 'Getting Started Application',
    scope: {
      read: 'true',
      write: 'true' },
    expiration: 'never',
    success: authenticationSuccess,
    error: authenticationFailure
  });
}

var showBoards = function(t) {  
  Trello.authorize()

  var success = function(successMsg) {
    console.log(successMsg);
  };

  var error = function(errorMsg) {
    console.log(errorMsg);
  };

  Trello
  .get('/member/me/boards', success, error)
  .then(boards => {
    var values = boards.map(x => {
      return {
        name: x.name,
        shortlink: x.shortLink
      }
    })

    var html = `
      ${values.map(board => `
        <input type='checkbox' 
               class='projectboard' 
               value='${board['shortlink']}' />
        ${board['name']}
        <br/>`).join('\n')}
    `

    document.getElementById('projects').innerHTML = html
  })
  .then(function() {
    t.get('board', 'private', 'my-project-boards')
    .then(my_project_boards => {
      console.log('hey');
      console.log(my_project_boards)

      for (let value of my_project_boards) {
        console.log(value)
        $(`.projectboard[value="${value}"]`).checked = true;
      }
    })
  })
}