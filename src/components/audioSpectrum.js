import React, { useEffect, useRef } from 'react';

const AudioSpectrum = ({ audioStream, visualizer='bar', useAudioTag=false }) => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  
  function circleVisualizer(ctx, canvas, dataArray, bufferLength) {
    //fonte: https://github.com/CodeSpaceIndica/Javascript/blob/main/ep53_audio_visualizer/audiovis.js
    //fonte: https://www.youtube.com/watch?v=AQggCuH4QkM&ab_channel=TheBigInt
    //fonte: https://www.youtube.com/watch?v=VXWvfrmpapI&list=PLYElE_rzEw_sHeIIv7BMliQF5zB7BliJE&ab_channel=Frankslaboratory
    const { width, height } = canvas;
    // ctx.beginPath();
    // ctx.rect(0, 0, width, height);
    // ctx.fill();
    let hue = 0;
    let hueAdd = 1;
    let v;
    let cX = width/2;
    let cY = height/2;

    let radian = 0;
    let radianAdd = (2 * Math.PI)*(1.0/dataArray.length);
    ctx.fillStyle = "hsl(" + hue + ", 100%, 50%)"
    for(let i=0; i<dataArray.length; i++) {
        v = dataArray[i];

        let x = v * Math.cos(radian) + cX;
        let y = v * Math.sin(radian) + cY;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, (2 * Math.PI), false);
        ctx.fill();

        radian += radianAdd;
    }
    hue += hueAdd;
    if( hue > 360 ) {
        hue = 0;
    }
  }

  function barVisualizer(ctx, canvas, dataArray, bufferLength) {
    const { width, height } = canvas;
    const barWidth = (width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 2;

      ctx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
      ctx.fillRect(x, height - barHeight / 2, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  useEffect(() => {
    if(!audioStream) return;
    // alert('com audio')
    const canvasElement = canvasRef.current;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();

    
    // const audioElement = document.createElement('audio');
    // audioElement.autoplay = true;
    // audioElement.srcObject = new MediaStream([audioStream.getAudioTracks()[0]]);
    // document.body.appendChild(audioElement);

    // var a = new Audio('/file_example_MP3_700KB.mp3');
    // const source = audioContext.createMediaElementSource(a);
    // a.play();
    // a.loop = true;
    const stream = new MediaStream([audioStream.getAudioTracks()[0]]);
    if(useAudioTag) {
      audioRef.current.srcObject = stream;
    }
    // stream.getAudioTracks()[0].muted = true;
    const source = audioContext.createMediaStreamSource(stream);

    // const gainNode = audioContext.createGain();
    // gainNode.connect(audioContext.destination);
    // gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    source.connect(analyser);
    // permite ouvir o audio
    // analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    
    const canvasContext = canvasElement.getContext('2d');
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasContext.fillStyle = "rgba(0, 0, 0, 0)";

      switch(visualizer) {
        case 'bar':
          barVisualizer(canvasContext, canvasElement, dataArray, bufferLength);
          break;
        case 'arc':
          circleVisualizer(canvasContext, canvasElement, dataArray, bufferLength);
          break;
      }

    };

    draw();

    return () => {
      audioContext.close();
      source.disconnect();
    };
  }, [audioStream]);

  return (
    <div>
      <audio ref={audioRef} autoPlay></audio>
      {audioStream&&<canvas ref={canvasRef} className='w-full h-full' />}
    </div>
  );
};

export default AudioSpectrum;