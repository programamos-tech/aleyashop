'use client'

export function Footer() {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Hola! Tengo un error o necesito soporte técnico en Aleya Shop. ¿Podrías ayudarme?");
    const phoneNumber = "3002061711";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <footer className="hidden lg:block fixed bottom-20 right-6 z-30">
      <div 
        onClick={handleWhatsAppClick}
        className="flex items-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo_programamos.st.png"
            alt="Programamos.st"
            width={20}
            height={20}
            className="opacity-60 dark:opacity-40"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-light">
              Powered by
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              programamos.st
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
