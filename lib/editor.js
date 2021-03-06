var ace = require('brace')
require('brace/mode/javascript')
require('brace/theme/ambiance')
require("brace/ext/language_tools")

var NO_TRANSACTION = {}

var watch = require('observ/watch')

module.exports = RawEditor

function RawEditor(fileObject, onSave){
  if (!(this instanceof RawEditor)){
    return new RawEditor(fileObject, onSave)
  }
  this.onSave = onSave
  this.fileObject = fileObject
  this.file = fileObject && fileObject.file
}

RawEditor.prototype.type = 'Widget'

RawEditor.prototype.init = function(){
  var element = document.createElement('div')
  element.className = 'RawEditor'

  var el = document.createElement('div')

  var textEditor = this.editor = ace.edit(el)
  textEditor.onSave = this.onSave

  window.editors = window.editors || []
  window.editors.push(textEditor)

  textEditor.setTheme('ace/theme/ambiance');
  textEditor.session.setMode('ace/mode/javascript')
  textEditor.session.setUseWorker(false)
  textEditor.session.setTabSize(2)
  textEditor.renderer.setScrollMargin(20,100)
  textEditor.renderer.setPadding(20)
  textEditor.renderer.setShowGutter(false)
  textEditor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: false
  })

  textEditor.commands.addCommand({
    name: 'saveFile',
    bindKey: {
      win: 'Ctrl-S',
      mac: 'Command-S',
      sender: 'editor|cli'
    },
    exec: function(env, args, request) {
      // hACKS!
      if (textEditor.onSave) {
        textEditor.onSave()
      }
    }
  })

  var currentFile = null
  var self = this

  var currentTransaction = NO_TRANSACTION
  var currentSaveTransaction = NO_TRANSACTION

  textEditor.setFile = function(fileObject){
    clearTimeout(saveTimer)

    if (self.release){
      self.release()
      self.release = null
    }

    currentFile = fileObject

    if (fileObject){
      self.release = watch(fileObject, update)
    }
  }
  //textEditor.setSize('100%', '100%')

  function save(){
    var value = textEditor.session.getValue()
    currentSaveTransaction = value
    currentFile.set(value)
    currentSaveTransaction = NO_TRANSACTION
  }

  function update(){
    var data = currentFile ? currentFile() : null
    if (data && currentSaveTransaction !== data && textEditor.session.getValue() !== data){
      currentTransaction = data
      textEditor.session.setValue(data, -1)
      currentTransaction = NO_TRANSACTION
    }
  }

  var blurTimer = null
  textEditor.on('focus', function(){
    clearTimeout(blurTimer)
  })

  textEditor.on('blur', function(){
    clearTimeout(blurTimer)
    blurTimer = setTimeout(function(){
      if (!textEditor.isFocused()){
        update()
      }
    }, 100)
  })

  var saveTimer = null
  textEditor.on('change', function(){
    if (currentTransaction === NO_TRANSACTION){
      clearTimeout(saveTimer)
      saveTimer = setTimeout(save, 100)
    }
  })

  textEditor.setFile(this.fileObject)

  element.appendChild(el)
  return element
}

RawEditor.prototype.update = function(prev, elem){
  this.editor = prev.editor
  this.release = prev.release
  this.editor.onSave = this.onSave

  if (prev.file !== this.file){
    this.editor.setFile(this.fileObject)
  }
  return elem
}

RawEditor.prototype.destroy = function(elem){
  this.editor.destroy()
  this.release && this.release()
  this.release = null
}