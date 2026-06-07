import ThemeToggle from "./ThemeToggle";
import Image from "next/image";
// use public/ URL paths for Next Image
const darkLogo = "/assets/logo/darklogo.svg";
const reactLogo = "/assets/misc/react.svg";
import { Avatar } from "radix-ui";

//profile picture from react logo for now, will change later
//my profile picture link from the api was:
//"Photos/26/26F862F1-D62C-4F50-8B2F-D02DA1E79C4E_Photo.PNG"
//but i need to figure out how to get the full url for it, and also how to fetch it from the backend since it's not a public url

export default function Header() {
  return (
    <>
      <header className="container flex items-center justify-between p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="title flex items-center gap-3">
          {/* use Next Image pointing at public/assets */}
          <Image
            src={darkLogo}
            alt="Gradeflux Logo"
            width={64}
            height={64}
            className="h-8 w-auto"
          />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Gradeflux
          </h1>
        </div>
        <div className="header-right-container">
          <Avatar.Root className="AvatarRoot">
            <Avatar.Image
              className="AvatarImage"
              src={reactLogo}
              alt="Gradeflux Avatar"
            />
            <Avatar.Fallback className="AvatarFallback" delayMs={600}>
              GF
            </Avatar.Fallback>
          </Avatar.Root>
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}
