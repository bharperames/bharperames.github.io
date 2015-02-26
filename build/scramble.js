// TODO: Eliminate all DOM (View) code from this file -- 
//   or at split split into two pieces, view aware controller and core game logic
//
var GAME = {
    BoardSize:4,
    BoardCellSize:75,
    Letters:"deilstprlaenmlrs",
    Moves:[ {dx:-1,dy:-1}, {dx:0,dy:-1}, {dx:1,dy:-1}, {dx:-1,dy:0}, {dx:1,dy:0}, {dx:-1,dy:1}, {dx:0,dy:1}, {dx:1,dy:1} ],
    LetterValues:{a:1,b:4,c:4,d:2,e:1,f:4,g:0,h:3,i:1,j:0,k:0,l:2,m:4,n:2,o:1,p:4,q:10,r:1,s:1,t:1,u:2,v:5,w:4,x:8,y:3,z:10},
    findAll:false,
    MinWordLength:5,
    curLetterIndex: -1,
    canvas: null
};


GAME.setup = function() {
    React.render(React.createElement(ScrambleCanvas, null), document.getElementById('gameBoardCanvasDiv'));
    this.canvas = $('#gameBoardCanvas')[0];
    this.BoardCellSize = this.canvas.width / this.BoardSize;
    this.board  = this.constructBoard(GAME.BoardSize);

    this.wordTree = buildWordIndex(ENGLISHWORDS);

    this.restartGame();
}

GAME.restartGame = function() 
{
	var letters = $('#letters')[0];
	if (letters && letters.value && letters.value.length == this.board.length)
		this.Letters = letters.value;
	else {
		alert("Please enter " + this.board.length + " letters in the letter box.");
		letters.value = this.Letters;
	}
	this.findAll = $('#findall')[0].checked;
    this.clearBoard();
    this.startGame();
}

GAME.clearBoard = function() 
{
    var clearCell = function(game, cellNum)
    {
		var context = game.canvas.getContext("2d");
		context.fillStyle = "rgb(255, 255, 255)";  // or with alpha use: rgba(255,255,255,1)

		var cy = Math.floor(cellNum / GAME.BoardSize);
		var cx = cellNum - cy*GAME.BoardSize;

		context.fillRect(cx*GAME.BoardCellSize+1, cy*GAME.BoardCellSize+1, (cx+1)*GAME.BoardCellSize-1, (cy+1)*GAME.BoardCellSize-1);
    };

    for (i = 0; i < this.board.length; i++) 
    {
		this.board[i] = this.Letters.substring(i, i+1);
		clearCell(this, i);
		var drawLetter = this.board[i];
		if (drawLetter == 'q')
			drawLetter = "qu";
		this.drawText(i, drawLetter);
    }

    this.drawBoard();

}
  
GAME.startGame = function()
{
	this.showAllWords();
}

GAME.getWordLetters = function()
{
	var wordLetters = [];
	for (i = 0; i < this.board.length; i++) 
    {
		wordLetters.push(this.board[i]);
	}

	return wordLetters;
}

GAME.showAllWords = function() 
{
    var totalWords = 0;
    var results = "";
    var cellLetter;
    var wordListObj;

    for (i = 0; i < this.board.length; i++) 
    {
		cellLetter  = this.board[i];
		wordListObj = this.findCellWords(i);

		// console.log("Words for " + i + " are " + wordListObj.words);
		// var wordList = "";
		// for (j = 0; j < wordListObj.words.length; j++) {
		// 	console.log("FOUND WORD: " + wordListObj.words[j] + " " + this.wordValue(wordListObj.words[j]));	
		// 	wordList += (wordListObj.words[j] + " ");
		// }
		// console.log("FOUND WORDS: " + wordList);

		totalWords += wordListObj.words.length;
		results += (cellLetter.toUpperCase() + " :: " + wordListObj.words + "\n");
    }
    results += ("Found a total of: " + totalWords + " words.\n");

    $('#results')[0].value = results;
}

// Compute word value, considering letter values
//  TODO: Add ability to specify which tiles are double-word, triple-word, etc...
//
GAME.wordValue = function(word)
{
    // console.log(word);
	var value = 0;
	var wl = word.length;
	var letter; 
	for (i = 0; i < wl; i++) {
		letter = word.substring(i, i+1);
		if (GAME.LetterValues[letter] != undefined) {
			value += GAME.LetterValues[letter];
		}
	}

	return value;
}


// Return an object with two parallel arrays: {[words], [wordPaths]}
//  TODO: Elsewhere this structure is transformed into a single array of tuples, unify that
//
GAME.findCellWords = function(cellNum)
{
    var cellLetter = this.board[cellNum];

    var wordNode = this.wordTree[cellLetter];
    if (wordNode == undefined) {
		// console.log("No words start with: " + cellLetter);
		return;
    }

    var visitedCells = [false, false, false, false, false, false, false, false, false];
    var returnObj = this.findWords(cellNum, visitedCells, wordNode, "", []);

    return returnObj;
}

// Recursive function to explore cell space one letter move at a time along paths found
//   in the word tree
//
GAME.findWords = function(cellNum, visitedCells, wordNode, partialWord, partialPath) {
	// Return an object with two parallel arrays: {[words], [wordPaths]}
	var returnObj   = {words: [], wordPaths: []};
    var cell_coords = this.board.cellCoordinates(cellNum);
    var curx = cell_coords.cx;
    var cury = cell_coords.cy;

    visitedCells[cellNum] = true;
//    console.log("Node: " + wordNode.letter);

	// Determine if existing partial word + this cell is a final word
    partialWord += wordNode.letter;

    if (wordNode.final != undefined) {
		if (returnObj.words.indexOf(partialWord) == -1 && (this.findAll || partialWord.length >= this.MinWordLength))
		{
			// console.log(partialWord + ":" + partialPath.join(","));
		    returnObj.words.push(partialWord);
		    returnObj.wordPaths.push(partialPath);
		}
    }

    // Special case 'Q' tile on board, treat it as "Qu"
	if (wordNode.letter == 'q') {
		partialWord += 'u';
		wordNode = wordNode['u'];
		if (wordNode == undefined)
		    return []; // This can't happen in Scramble, no Q words without a "U" next
	}


	// Explore each of the 9 possible move directions for valid word continuations
	//   for each candidate path, recusively call self to continue exploring the word tree
	//
    for (var i = 0; i < this.Moves.length; i++) {
		var local_visitedCells = visitedCells.concat();
		var newx = curx + this.Moves[i].dx;
		var newy = cury + this.Moves[i].dy;
		if (newx < 0 || newx >= GAME.BoardSize || newy < 0 || newy >= GAME.BoardSize)
		    continue;

		var nextCellNum    = this.board.cellNumber(newx, newy);
		if (local_visitedCells[nextCellNum] == true)
		    continue;
		var nextCellLetter = this.board[nextCellNum];
		var nextWordNode   = wordNode[nextCellLetter];
		if (nextWordNode == undefined)
		    continue;

		recurPartialPath = partialPath.concat();
		recurPartialPath.push(i);
		var newWords = this.findWords(nextCellNum, local_visitedCells, nextWordNode, partialWord, recurPartialPath);
		for (var w=0;w<newWords.words.length;w++) {
			// For each of the words found in this iteration add them to the
			//  composite list if not already in list
			//
		    if (returnObj.words.indexOf(newWords.words[w]) == -1) {
				returnObj.words.push(newWords.words[w]);
				returnObj.wordPaths.push(newWords.wordPaths[w]);
			}
		}
		    
	//	console.log("RESUME: " + partialWord);
    }	

    return returnObj;
}

// TODO: Find better way to encapsulate the overlay segment information
//   - how to provide local state to timer function, unless it is defined as closure?
// 
var OverlaySegment = function() {

	var that = {};
	that.pathSegmentsX = [];
	that.pathSegmentsY = [];
 	that.pathSegmentIndex = -1;
 	that.pathSegmentTimerId = -1;
 	that.pathSegmentContext = null;

 	// Private
 	that.drawWordLineOverlaySegment = function()
	{
		if (OverlaySegment.pathSegmentIndex < 0)
			return;

		GAME.clearBoard();

	    OverlaySegment.pathSegmentContext.beginPath();

		OverlaySegment.pathSegmentContext.moveTo(OverlaySegment.pathSegmentsX[0], OverlaySegment.pathSegmentsY[0]);
	    for (var j = 1; j <= OverlaySegment.pathSegmentIndex+1; j++)
	    {
			OverlaySegment.pathSegmentContext.lineTo(OverlaySegment.pathSegmentsX[j], OverlaySegment.pathSegmentsY[j]);
	    }
		OverlaySegment.pathSegmentIndex++;
		if (OverlaySegment.pathSegmentIndex == OverlaySegment.pathSegmentsX.length-1)
			OverlaySegment.pathSegmentIndex = 0;

	    OverlaySegment.pathSegmentContext.strokeStyle = "purple";
	    OverlaySegment.pathSegmentContext.lineJoin    = "round";
	    OverlaySegment.pathSegmentContext.lineCap     = "round";
	    OverlaySegment.pathSegmentContext.lineWidth   = 15;
	    OverlaySegment.pathSegmentContext.strokeStyle = 'rgba(255,0,255,0.2)';
	    OverlaySegment.pathSegmentContext.stroke();

	    var waitTime = (OverlaySegment.pathSegmentIndex == 0)? 1000 : 200;
	   	OverlaySegment.pathSegmentTimerId = setTimeout(OverlaySegment.drawWordLineOverlaySegment, waitTime);
	};

	that.drawWordLineOverlay = function(cellNum, word, wordPath)
	{
		// Calculate the path once, then setup a timer to animate it over time.
		//
	    var cell_coords = GAME.board.cellCoordinates(cellNum);
	    var cx          = (cell_coords.cx + .35) * GAME.BoardCellSize;
	    var cy          = (cell_coords.cy + .65) * GAME.BoardCellSize;

		OverlaySegment.pathSegmentsX = [cx];
		OverlaySegment.pathSegmentsY = [cy];
		OverlaySegment.pathSegmentIndex = 0;
		OverlaySegment.pathSegmentContext = GAME.canvas.getContext("2d");

		wordPath.map(
			function(arrayElemValue) {
				var movePair = GAME.Moves[arrayElemValue];
				cx += movePair.dx * GAME.BoardCellSize;
				cy += movePair.dy * GAME.BoardCellSize;
				OverlaySegment.pathSegmentsX.push(cx);
				OverlaySegment.pathSegmentsY.push(cy);
			}
		);

		if (OverlaySegment.pathSegmentTimerId != -1)
			clearInterval(OverlaySegment.pathSegmentTimerId);
		OverlaySegment.pathSegmentTimerId = setTimeout(OverlaySegment.drawWordLineOverlaySegment, 200);
	}

	return that;
}();

GAME.drawWordLineOverlay = function(cellNum, word, wordPath)
{
	OverlaySegment.drawWordLineOverlay(cellNum, word, wordPath);
}



GAME.drawText = function(cellNum, text)
{
    var cell_coords = this.board.cellCoordinates(cellNum);
    var cx          = (cell_coords.cx + .35) * GAME.BoardCellSize;
    var cy          = (cell_coords.cy + .65) * GAME.BoardCellSize;

    var context     = this.canvas.getContext("2d");
    context.fillStyle = '#f00';
    context.font = 'italic bold 24px sans-serif';
    context.fillText(text, cx, cy );
}

GAME.drawBoard = function()
{
    var context = this.canvas.getContext("2d");
    context.beginPath();

    for (var i = 0; i <= GAME.BoardSize; i++) {
	context.moveTo(i * GAME.BoardCellSize, 0);
	context.lineTo(i * GAME.BoardCellSize, GAME.BoardCellSize*GAME.BoardSize);

	context.moveTo(0, i * GAME.BoardCellSize);
	context.lineTo(GAME.BoardCellSize*GAME.BoardSize, i * GAME.BoardCellSize);
    }

    context.strokeStyle = "black";
    context.lineWidth   = 3;
    context.stroke();
}

GAME.constructBoard = function(boardSize)
{
    var board = new Array(boardSize * boardSize)
    board.boardSize = boardSize;

    board.cellNumber = function (x, y) {
		return this.boardSize*y + x;
    } 

    board.cellCoordinates = function (cellNum) {
		var cy = Math.floor(cellNum / this.boardSize);
		var cx = cellNum - cy*this.boardSize;
		return {cx:cx, cy:cy};
    } 

    return board;
}


GAME.setup();


function alert(msg) {
	var msglabel = $('#message')[0];
	if (msglabel)
		msglabel.innerHTML = msg;

 	console.log(msg) 
};

//
// Word Tree data structures and algorithm
//

function WordNode(letter) {
    return {letter:letter};
}

function buildWordIndex(wordList) {
    var wordTree = WordNode("");
    wordTree.wordCount = 0;

    for (var i=wordList.length-1; i >= 0; i--) {
		// Every word starts its path at the root
		var wordNode = wordTree;

		var word = wordList[i];
		var wordlen = word.length;
		for (var ci = 0; ci < wordlen; ci++) {
		    var letter = word.substring(ci, ci+1);
		    // See if the current word node (could be root) already has this node
		    var letterNode = wordNode[letter];
		    // If we have not indexed a word with a similar opening letter sequence, then start that path
		    if (letterNode == undefined) {
				letterNode = WordNode(letter);
				wordNode[letter] = letterNode;
		    }
		    wordNode = letterNode;
		}
		// At the end of a word, mark the node as a final word
		wordNode.final = true;
		wordTree.wordCount++;
    }  

    return wordTree;
}

function validWord(wordNode, word) {
    var wordlen = word.length;
    for (var ci = 0; ci < wordlen; ci++) {
	var letter = word.substring(ci, ci+1);
	// See if the current word node (could be root) has this node
	var letterNode = wordNode[letter];
	if (letterNode == undefined) {
	    return false;
	}
	wordNode = letterNode;
    } 

    return wordNode && (wordNode.final != undefined);
}

function testWordBuilder() {
    var ValidWords=["cat", "cow", "dog", "owl", "wax"];
    var InvalidWords=["tac", "cowe", "do", "OWL", "waxx"];
    var testPass=true;
    var wordTree = buildWordIndex(ValidWords);
    for (var i=0;i<ValidWords.length;i++) {
	var word = ValidWords[i];
	if (! validWord(wordTree, word)) {
	    console.log("Word Index Broken, missing word: " + word);
	    testPass = false;
	}
    }
    for (var i=0;i<InvalidWords.length;i++) {
	var word = InvalidWords[i];
	if ( validWord(wordTree, word)) {
	    console.log("Word Index Broken, has word: " + word);
	    testPass = false;
	}
    }
    
    return testPass;
}

function XX_buildWords(wordNode, word) {
    for (letterNode in wordNode) {
	word += letterNode.letter;
	if (letterNode.final != undefined) {
	    wordList.push(word);
	}
	if (maxcount++ < 100)
	   buildWords(letterNode, word);
    }
}    

