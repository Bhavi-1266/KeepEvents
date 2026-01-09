
import type {Event}  from "../types/event.ts";
import type  {Photo} from "../types/photos.ts";

interface CreateCardProps {
  ToCreate: string;

  onClick?: () => void;
}

function CreateCard({ ToCreate, onClick }: CreateCardProps) {
 

  return (

    <div
      onClick={onClick}
      className="flex flex-col justify-center   max-w-sm  rouded-lg h-full  border border-gray-300 shadow-md hover:shadow-lg cursor-pointer transition-shadow duration-200"
    >
      {/* Cover Image */}
      <div className="">
        { 
          <img
            src={"../../src/assets/add.png"} 
            alt={"Add"+ToCreate}
            className=" my-4 h-28 opacity-70 w-full object-contain  "
          />
        } 
      </div>

      {/* Content */}
      <div className="p-4">
        <h2 className="text-2xl font-normal  mb-1 text-center  ">
          Add {ToCreate}    
        </h2>
      </div>
    </div>
  );
}

export default CreateCard;
