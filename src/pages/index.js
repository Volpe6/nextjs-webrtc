import Head from 'next/head'
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Chat from '../components/chat';
import ContactList from '@/components/contactList';


export default function Home() {

  const { user } = useAuth();

  const { currConnection: conn } = useConnection();

  if(!user) {
    return;
  }

  return (
    <>
      <Head>
        <title>Meet</title>
        <meta name="description" content="Your virtual meet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-row h-screen overflow-hidden">
        <ContactList />
        {/* <div className='relative drag-area'>
          <MediaControls userAudioStream={audioStream} />
        </div> */}
        {conn && <Chat />}
      </main>
    </>
  )
}