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
        <div className={`${conn?'hidden':'flex'} md:flex flex-col justify-start w-full md:w-[500px] min-w-[300px] border-r border-gray-500`}>
          <ContactList />
        </div>
        
        {/* <div className='relative drag-area'>
          <MediaControls userAudioStream={audioStream} />
        </div> */}
        <div className={`w-full ${conn?'block':'hidden'} md:flex items-center justify-center bg-gradient-to-r from-green-400 to-purple-500`}>
          {!conn&&<h1>Sem conversa selecionada</h1>}
          {conn && <Chat />}
        </div>
      </main>
    </>
  )
}