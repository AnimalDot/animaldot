interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export default function SecondaryButton({ children, onClick, disabled }: SecondaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-white text-[#3A7BFF] py-4 px-6 rounded-2xl border-2 border-[#3A7BFF] hover:bg-[#F5F7FA] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}