
// TODO: Get rid of global "GAME" variable

var ScrambleCanvas = React.createClass({displayName: "ScrambleCanvas",
	render: function() {
		return React.createElement("canvas", {id: "gameBoardCanvas", width: "200", height: "200", onClick: this.handleClick});
	},
  	handleClick: function(e) {
		var cx = Math.floor((e.clientX - e.target.offsetLeft) / GAME.BoardCellSize);
		var cy = Math.floor((e.clientY - e.target.offsetTop) / GAME.BoardCellSize);
		var cellNum = cy*GAME.BoardSize+cx;

		globalShowWordsForCell(cellNum);
  	}

});


var WordButton = React.createClass({displayName: "WordButton",
  render: function() {
  	var btnStyles = {background:this.props.btnColor};
    return React.createElement("button", {id: this.props.id, className: "wordButton", style: btnStyles, onClick: this.handleClick}, this.props.word);
  },
  handleClick: function(event) {
    globalShowWord(this.props.letterIndex, this.props.word, this.props.wordPath);
  }

});


var WordButtons = React.createClass({displayName: "WordButtons",
  render: function() {
  	// Make a local variable to use in the "createButton" scope
  	var letterIndex = this.props.letterIndex;
    var createButton = function(arrayElemValue, arrayElemIndex, origArray) {
       var colorStyle = "#fff";
       return React.createElement(WordButton, {id: "WordButton_"+arrayElemValue.word, btnColor: colorStyle, 
       		letterIndex: letterIndex, word: arrayElemValue.word, wordIndex: arrayElemIndex, wordPath: arrayElemValue.wordPath, 
       		class: "btn", onClick: this.handleClick}, arrayElemValue.word
       		);
    };

    if (this.props.wordPairs.length > 0)
    	return (React.createElement("div", null, this.props.wordPairs.map(createButton)));
    else
    	return (React.createElement("span", null, "No words for that letter"));
  }
});


function globalUpdateLetterButtons(letterIndex, wordsObj)
{
	var wordPairs = [];
	for (i = 0; i < wordsObj.words.length; i++)
	{
		wordPairs.push({word: wordsObj.words[i], wordPath: wordsObj.wordPaths[i]});
	}
	wordPairs.sort(function(a,b) {return (GAME.wordValue(a.word) > GAME.wordValue(b.word))? -1 : 1;})

	React.render(React.createElement(WordButtons, {letterIndex: letterIndex, wordPairs: wordPairs}), document.getElementById('wordButtons'));

	if (wordPairs.length > 0)
		// TODO: Change to programmatically click first word button by default.
		globalShowWord(letterIndex, wordPairs[0].word, wordPairs[0].wordPath);
}


function globalShowWord(letterIndex, word, wordPath)
{
	GAME.drawWordLineOverlay(letterIndex, word, wordPath);
}

function globalShowWordsForCell(letterIndex)
{
	GAME.curLetterIndex = letterIndex;

	var wordsObj = GAME.findCellWords(letterIndex);

	globalUpdateLetterButtons(letterIndex, wordsObj);
}



