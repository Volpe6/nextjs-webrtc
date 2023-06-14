import { useState } from 'react';
import useAuth from '../hook/useAuth';
import useConnection from '../hook/useConnection';
import Contact from '@/components/contact';
import { AiOutlinePlusCircle, AiOutlineArrowLeft } from "react-icons/ai";

function ContactList() {
    const { user } = useAuth();

    const { currConnection: conn, callManager, connections, addContact } = useConnection();

    const [targetName, setTargetName] = useState('');
    const [showNewContact, setShowNewContact] = useState(false);

    const handleTargetName = (event) => {
        setTargetName(event.target.value)
    }

    const handleCall = () => {
        // if(connections.length > 0) {
        //   alert('atuamente somente uma conexao por vez');
        //   return;
        // }
        callManager.call({targetName: targetName});
        setTargetName('');
    }

    const handleAddContact = () => {
    addContact({targetName: targetName});
    setTargetName('');
    }


    const handleNewContact = () => {
    setShowNewContact(!showNewContact);
    };

    return (
        <>
            <div className="flex flex-col justify-start w-1/4 md:w-[500px] min-w-[300px] border-r border-gray-500">
            {
                showNewContact?
                (
                <>
                    <header className='p-2 border-b'>
                    <div className='flex justify-between'>
                        <div className='flex space-x-1 items-center cursor-pointer mb-4' onClick={handleNewContact}>
                        <span>
                            <AiOutlineArrowLeft/>
                        </span>
                        <span>
                            Voltar
                        </span>
                        </div>
                        <div>
                        <h3> user: {user.name}</h3>
                        </div>
                    </div>
                    <div>
                        <div className="flex space-x-1 mb-4">
                        <input
                            type="text"
                            value={targetName}
                            placeholder="Enter your partner code"
                            onChange={handleTargetName}
                            className="flex-grow mr-2 w-full rounded-md py-2 px-3 border border-gray-400 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            className="rounded-md py-2 px-4 bg-blue-500 text-white font-medium focus:outline-none hover:bg-blue-600"
                            onClick={handleAddContact}
                        >
                            add
                        </button>
                        <button
                            className="rounded-md py-2 px-4 bg-blue-500 text-white font-medium focus:outline-none hover:bg-blue-600"
                            onClick={handleCall}
                        >
                            call
                        </button>
                        </div>
                    </div>
                    </header>
                    <div className='p-2 border-b'>Contatos</div>
                    <div className={`overflow-auto ${connections.length===0&&'flex h-full items-center justify-center'}`}>
                    {connections.length===0&&'Sem conversas'}
                    {connections.map((conn, i) => 
                        <div key={i}>
                        <Contact connection={conn} />
                        </div>
                    )}
                    </div>
                </>
                ):
                (
                <>
                    <header className='flex justify-between p-2 border-b'>
                    <div>
                        <h3> user: {user.name}</h3>
                    </div>
                    <div className='flex justify-center items-center'>
                        <AiOutlinePlusCircle 
                        onClick={handleNewContact}
                        className="tooltip text-2xl" 
                        data-tooltip-content="nova conversa"/>
                    </div>
                    </header>
                    <div className='p-2 border-b'>Contatos</div>
                    <div className={`overflow-auto ${connections.length===0&&'flex h-full items-center justify-center'}`}>
                    {connections.length===0&&'Sem conversas'}
                    {connections.map((conn, i) => 
                        <div key={i}>
                        <Contact connection={conn} />
                        </div>
                    )}
                    </div>
                </>
                )
            }
            </div>
        </>
    );
}

export default ContactList;