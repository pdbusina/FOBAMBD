import React, { useEffect } from 'react';

export const Message = ({ text, isError, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'} no-print`}>
            {text}
        </div>
    );
};

export const AccessButton = ({ icon, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center w-full p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition duration-300 ease-in-out border border-gray-200"
    >
        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
            {icon}
        </div>
        <div className="ml-6 text-left">
            <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
            <p className="text-gray-500 mt-1">{description}</p>
        </div>
    </button>
);

export const TabButton = ({ id, label, isActive, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`px-3 py-2 md:px-4 md:py-2 text-sm md:text-base font-medium rounded-md transition duration-200 mx-1 mb-1 ${isActive
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            }`}
    >
        {label}
    </button>
);
