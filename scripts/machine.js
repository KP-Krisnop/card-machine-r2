const machineCodeInput = document.querySelector('#machine-code-input');
const connectButton = document.querySelector('#machine-connect-button');
const machineStatus = document.querySelector('#machine-status');
const cardNumberInput = document.querySelector('#card-number-input');
const directionInput = document.querySelector('#direction-input');
const turnInput = document.querySelector('#turn-input');
const dealButton = document.querySelector('#deal-button');

machineCodeInput.value = localStorage.getItem('machineCode');

let ipAddress = '';
let socket;
let conState = false;

// let machineDirection = null;

const pValue = 200;
const iValue = 20;
const dValue = 500;
const startOfset = 250;
const startSpeed = 180;

connectButton.addEventListener('click', () => {
  if (!conState && machineCodeInput.value !== '') {
    // Create IP Address
    const machineCode = machineCodeInput.value;

    if (machineCode.length == 4) {
      ipAddress = machineCode.slice(0, 1) + '.' + machineCode.slice(1);
    } else if (machineCode.length == 5) {
      ipAddress = machineCode.slice(0, 2) + '.' + machineCode.slice(2);
    }
    ipAddress = 'ws://192.168.' + ipAddress + ':81';
    // Change Texts
    localStorage.setItem('machineCode', machineCode);
    machineStatus.innerText = 'Connecting . . .';
    connectButton.innerText = 'Disconnect';
    conState = !conState;
    // Connect and log
    console.log(ipAddress);
    webSocket(ipAddress);
  } else if (conState) {
    socket.close();
    connectButton.innerText = 'Connect';
    conState = !conState;
  }
});

function webSocket(ipAddress) {
  // //connect to websocket server
  socket = new WebSocket(ipAddress);

  socket.addEventListener('open', function (event) {
    console.log('WebSocket connected');
    machineStatus.innerText = 'Connected';

    const message = [0, cardNumberInput.value, 1, 0, 0, 0, 0, 0, 0, 2].join(',');
    socket.send(message);
  }); // Connection opened

  socket.addEventListener('close', function (event) {
    console.log('WebSocket disconnected');
    machineStatus.innerText = 'Disconnected';
  }); // Connection closed

  socket.addEventListener('message', function (event) {
    let message = event.data;
    console.log(message);

    if (message.slice(0, 3) == 'bat') {
      const battPercent = calBatt(message.slice(4));
      machineStatus.innerText = 'Battery ' + battPercent + ' %';
    }
  }); // Listen for messages
}

dealButton.addEventListener('click', () => {
  if (conState) {
    const actualFirstPlayer = findRelativePosition(directionInput.value, machineDirection, turnInput.value);

    let commandValues = [
      1, // activation
      cardNumberInput.value, // number of cards
      directionInput.value, // direction
      actualFirstPlayer, // player turn
      pValue, // P value
      iValue, // I value
      dValue, // D value
      startOfset, // initial offset
      startSpeed, // initial speed
      2, // game type
    ];
    let message = commandValues.join(', ');
    console.log(message);
    socket.send(message);
  } else {
    showError(5);
  }
});

cardNumberInput.oninput = () => {
  if (conState) {
    const message = [0, cardNumberInput.value, 0, 0, 0, 0, 0, 0, 0, 2].join(',');
    console.log(message);
    socket.send(message);
  }
};

function calBatt(analogValue) {
  return Math.ceil((100 / 677) * analogValue - 317);
}

function updateParam(scoreChanges, scores) {
  let highestValue = scoreChanges[0];
  let highestIndex = 0;

  for (let i = 1; i < scoreChanges.length; i++) {
    if (scoreChanges[i] > highestValue) {
      highestValue = scoreChanges[i];
      highestIndex = i;
    } else if (scoreChanges[i] == highestValue) {
      if (sumArray(scores[i]) > sumArray(scores[highestIndex])) {
        highestIndex = i;
      }
    }
  }

  let leftIndex;
  let rightIndex;
  let direction;

  if (highestIndex == 0) {
    leftIndex = 3;
    rightIndex = highestIndex + 1;
  } else if (highestIndex == 3) {
    leftIndex = highestIndex - 1;
    rightIndex = 0;
  } else {
    leftIndex = highestIndex - 1;
    rightIndex = highestIndex + 1;
  }

  console.log('L:', leftIndex, 'R: ', rightIndex);

  if (scoreChanges[leftIndex] > scoreChanges[rightIndex]) {
    direction = -1;
  } else if (scoreChanges[rightIndex] > scoreChanges[leftIndex]) {
    direction = 1;
  } else {
    if (scores[leftIndex] > scores[rightIndex]) {
      direction = -1;
    } else if (scores[rightIndex] > scores[leftIndex]) {
      direction = 1;
    } else {
      direction = directionInput.value;
    }
  }

  console.log(highestIndex);

  console.log('First player:', findRelativePosition(direction, machineDirection, turnInput.value), ' Direction', direction);

  directionInput.value = direction;
  turnInput.value = highestIndex;
}

function findRelativePosition(spinDir, machDir, terget) {
  const circleOfPlayer = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3];
  let i;
  let relativePos = 0;

  for (i = 0; i < 4; i++) {
    const position = circleOfPlayer[machDir + 4 + i * spinDir];
    console.log('i ', i);

    if (position == terget) {
      console.log('ac', i);
      relativePos = i;
    }
  }

  return relativePos;
}
