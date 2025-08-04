import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPrevious: () => void;
    onNext: () => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    onPrevious,
    onNext,
}) => {
    // Função para gerar os números das páginas a serem exibidos
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // Se temos poucas páginas, mostra todas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Lógica para mostrar páginas com elipses
            if (currentPage <= 3) {
                // Início: 1, 2, 3, 4, 5
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
            } else if (currentPage >= totalPages - 2) {
                // Final: ..., n-4, n-3, n-2, n-1, n
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // Meio: ..., current-1, current, current+1, ...
                for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                    pages.push(i);
                }
            }
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex justify-center items-center space-x-1 mt-8">
            {/* Botão Anterior */}
            <button
                onClick={onPrevious}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-300 py-2 px-3 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
            >
                Anterior
            </button>

            {/* Números das páginas */}
            {pageNumbers.map((pageNumber) => (
                <button
                    key={pageNumber}
                    onClick={() => onPageChange(pageNumber)}
                    className={`min-w-9 rounded-md py-2 px-3 border text-center text-sm transition-all shadow-sm hover:shadow-lg focus:shadow-none active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none ml-2 ${pageNumber === currentPage
                        ? 'bg-slate-800 border-transparent text-white focus:bg-slate-700 active:bg-slate-700 hover:bg-slate-700'
                        : 'border-slate-300 text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800'
                        }`}
                >
                    {pageNumber}
                </button>
            ))}

            {/* Botão Próximo */}
            <button
                onClick={onNext}
                disabled={currentPage === totalPages}
                className="rounded-md border border-slate-300 py-2 px-3 text-center text-sm transition-all shadow-sm hover:shadow-lg text-slate-600 hover:text-white hover:bg-slate-800 hover:border-slate-800 focus:text-white focus:bg-slate-800 focus:border-slate-800 active:border-slate-800 active:text-white active:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none ml-2"
            >
                Próximo
            </button>
        </div>
    );
};

export default Pagination;