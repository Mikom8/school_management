import { React } from "react";

const Assignment = () => {
    return (
        <>
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                        Post Assignment or Handout
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Fill the details below to post your assignment or handout
                    </p>
                </div>
            </div>
        </>
    )
};

export default Assignment;