function Message({ props }) {
    const { id, sender, message } = props;
    return (<>
        <div id={id} className={`flex ${sender? 'items-end justify-end':'items-start justify-start'}`}>
            <div className={`rounded-lg p-2 ${sender?'bg-blue-500 text-white': 'bg-gray-100'}`}>
                <p className="text-sm">{message}</p>
            </div>
            <a id={`download-${id}`}></a>
        </div>
    </>);
}

export default Message;