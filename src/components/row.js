import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { useRef, useState } from 'react';


function Row({ children }) {
  const rowRef = useRef(null)
  const [isMoved, setIsMoved] = useState(false)

  const handleClick = (direction) => {
    setIsMoved(true)
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current

      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-0.5 md:space-y-2">
      <div className="group relative">
        <HiChevronLeft
          className={`absolute top-0 bottom-0 left-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 ${
            !isMoved && 'hidden'
          }`}
          onClick={() => handleClick('left')}
        />
        <div
          className="flex items-center"
          ref={rowRef}
        >
          {children}
        </div>
        <HiChevronRight
          className="absolute top-0 bottom-0 right-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100"
          onClick={() => handleClick('right')}
        />
      </div>
    </div>
  )
}

export default Row;