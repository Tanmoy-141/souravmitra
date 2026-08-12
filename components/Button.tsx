export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
}

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  const baseStyle = "px-6 py-2 transition-colors duration-200 font-medium";
  const variants = {
    primary: "bg-[#C5A059] text-white hover:bg-[#A88849]",
    outline: "border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />
  );
};
