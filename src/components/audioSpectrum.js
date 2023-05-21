import React, { useEffect, useRef } from 'react';

const AudioSpectrum = ({ audioStream }) => {
  const canvasRef = useRef(null);

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
    const stream = new MediaStream([audioStream.getAudioTracks()[0]])
    // stream.getAudioTracks()[0].muted = true;
    const source = audioContext.createMediaStreamSource(stream);

    // const gainNode = audioContext.createGain();
    // gainNode.connect(audioContext.destination);
    // gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    source.connect(analyser);
    // permite ouvir o audio
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    
    const canvasContext = canvasElement.getContext('2d');
    const WIDTH = canvasElement.width;
    const HEIGHT = canvasElement.height;
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasContext.fillStyle = "rgba(0, 0, 0, 0)";
      
      const barWidth = (WIDTH / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        canvasContext.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
        canvasContext.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
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
      <canvas ref={canvasRef} className='w-full h-[200px]' />
    </div>
  );
};

export default AudioSpectrum;