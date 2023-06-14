import '../styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import 'react-circular-progressbar/dist/styles.css';
import 'react-tooltip/dist/react-tooltip.css'
import { AuthProvider } from '../hook/useAuth';
import { ConnectionProvider } from '../hook/useConnection';
import { ToastContainer } from 'react-toastify';
import { Tooltip } from 'react-tooltip'


export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ConnectionProvider>
        <Component {...pageProps} />
        <ToastContainer />
        <Tooltip anchorSelect=".tooltip"/>
      </ConnectionProvider>
    </AuthProvider>
  )
}
