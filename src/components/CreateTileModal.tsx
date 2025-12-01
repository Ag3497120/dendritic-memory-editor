// src/components/CreateTileModal.tsx
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

interface CreateTileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (topic: string, content: string) => Promise<void>;
    predefinedDomains: string[];
    activeDomain: string;
}

export function CreateTileModal({ isOpen, onClose, onSubmit, predefinedDomains, activeDomain }: CreateTileModalProps) {
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || !content.trim()) {
            setError('Topic and content cannot be empty.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await onSubmit(topic, content);
            // Clear form and close modal on successful submission
            setTopic('');
            setContent('');
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to create tile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900"
                                >
                                    Create New Knowledge Tile
                                </Dialog.Title>
                                <p className="mt-1 text-sm text-gray-500">
                                    A new tile will be created in the "<strong>{activeDomain}</strong>" domain.
                                </p>

                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
                                            Topic
                                        </label>
                                        <input
                                            id="topic"
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="e.g., Photosynthesis Basics"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                                            Content
                                        </label>
                                        <textarea
                                            id="content"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            rows={5}
                                            placeholder="Enter the knowledge content here..."
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    {error && <p className="text-sm text-red-600">{error}</p>}
                                    <div className="mt-6 flex justify-end space-x-2">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-gray-400"
                                        >
                                            {isSubmitting ? 'Creating...' : 'Create Tile'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
