import Head from 'next/head';
import { useState } from 'react';
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Image from 'next/image';

function Login() {
  const { singUp } = useAuth();
  const { connectSocket } = useConnection();
  const [userName, setUserName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    singUp(userName);
    connectSocket();
  }

  return (
    <div>
      <Head>
        <title>Meet</title>
        <link rel="shortcut icon" href="/gierige_jakkals.svg" />
      </Head>
      <main className='relative bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 flex h-[100svh] flex-col items-center justify-center md:bg-transparent'>
        <div className='flex items-center justify-center'>
          <Image
            src="/gierige_jakkals.svg"
            width={100}
            height={100}
            alt="Picture of the author"
          />
        </div>
        <form
          className="space-y-8"
          onSubmit={handleSubmit}
        >
          <h1 className="text-4xl text-center font-semibold">Junte-se a nós</h1>
          <div className="space-y-4">
            <label className="inline-block w-full">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="userName"
                className={`flex-grow w-full mr-2 rounded-md py-2 px-3 border border-gray-400 focus:outline-none focus:border-blue-500`}
              />
            </label>
          </div>
          <button
            className="w-full rounded bg-green-600 py-3 font-semibold"
            type="submit"
          >
            inscrever-se
          </button>
        </form>
      </main>
      
    </div>
  )
}

export default Login;