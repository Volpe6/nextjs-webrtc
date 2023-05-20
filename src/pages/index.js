import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Chat from '../components/chat';
import useCall from '@/hook/useCall';
import Contact from '@/components/contact';
import MediaControls from '@/components/mediaControls';
import Video from '@/components/video';
import Drag from '@/components/drag';
import AudioSpectrum from '@/components/audioSpectrum';
import AudioAnalyser from '@/components/AudioAnalyser';


export default function Home() {

  const { user } = useAuth();
  const displayRef = useRef(null);

  const [streamFullScreen, setStreamFullScreen] = useState([]);
  const [currStream, setCrrStream] = useState([]);


  const { currConnection: conn,displayStream, callManager, connections, toogleAudio, toogleCamera, toogleDisplay, hangUp } = useConnection();

  if(!user) {
    return;
  }

  useEffect(() => {
        if(displayStream) {
          setCrrStream([...currStream, new MediaStream(displayStream.getTracks())]);
        }
    }, [displayStream]);

    const setFullScreen = (index) => {
      console.log('aqui');
      const prevCrr = [...currStream]
      const stream = prevCrr.splice(index, 1);
      setCrrStream([]);
      setStreamFullScreen([...streamFullScreen, stream[0]]);
    }
  
  // useEffect(() => {
  //   if(userStream) {
  //     displayRef.current.srcObject = displayStream;
  //   }
  // }, [displayStream]);

  const [targetName, setTargetName] = useState('');

  const handleTargetName = (event) => {
    setTargetName(event.target.value)
  }

  const handleVideo = () => {
    const videoTrack = userStream.getVideoTracks()[0];
    // Define a propriedade "enabled" como "false" para desativar a transmissão de vídeo
    videoTrack.enabled = !videoTrack.enabled;
  }

  const handleAudio = () => {
    const audioTrack = userStream.getAudioTracks()[0];
    // Define a propriedade "enabled" como "false" para mutar o áudio
    audioTrack.enabled = !audioTrack.enabled;
  }

  const handleCall = () => {
    // if(connections.length > 0) {
    //   alert('atuamente somente uma conexao por vez');
    //   return;
    // }
    callManager.call({targetName: targetName});
  }

  return (
    <>
      <Head>
        <title>Meet</title>
        <meta name="description" content="Your virtual meet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* <AudioAnalyser /> */}
      <AudioSpectrum />
      <audio controls src="/file_example_MP3_700KB.mp3" autoPlay />
    </>
  )
}