let allBooks = [];
let swiper;

document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allBooks = data;
            renderBooks(allBooks);
            renderizarTags();

            // Adiciona o "escutador" para a busca em tempo real
            const campoBusca = document.getElementById('campo-busca');
            campoBusca.addEventListener('input', aplicarFiltros);
        });
});

function renderBooks(books) {
    const container = document.getElementById('livros-container');
    container.innerHTML = ''; // Limpa o conteúdo anterior

    if (books.length === 0) {
        // Se não houver livros, exibe uma mensagem.
        container.innerHTML = '<p class="nenhum-resultado">Nenhum livro encontrado com este nome.</p>';

        if (swiper) {
            swiper.destroy(true, true);
            swiper = undefined;
        }
        return;
    }

    books.forEach(livro => {
        const card = `
            <div class="swiper-slide">
                <article class="card">
                    <h2>${livro.nome}</h2>
                    <p class="ano-publicacao">${livro.data_lancamento}</p>
                    <p>${livro.descricao}</p>
                    <div class="tags">${livro.tags.join(' ')}</div>
                    <a href="${livro.link}" target="_blank">Saiba mais</a>
                </article>
            </div>
        `;
        container.innerHTML += card;
    });

    // Destrói a instância anterior do Swiper se existir
    if (swiper) {
        swiper.destroy(true, true);
    }

    // Inicializa o Swiper
    swiper = new Swiper('.swiper-container', {
        loop: books.length > 3, // O loop só faz sentido se houver mais slides que o visível
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        // Configurações responsivas (breakpoints)
        breakpoints: {
            // quando a largura da janela for >= 320px
            320: {
                slidesPerView: 1,
                spaceBetween: 20
            },
            // quando a largura da janela for >= 768px
            768: {
                slidesPerView: 2,
                spaceBetween: 30
            },
            // quando a largura da janela for >= 1024px
            1024: {
                slidesPerView: 3,
                spaceBetween: 30
            }
        }
    });
}

// DEPRECATED: A lógica foi movida para aplicarFiltros
function iniciarBusca() { aplicarFiltros(); }

function renderizarTags() {
    const container = document.getElementById('filtros-container');
    
    // Extrai todas as tags, remove espaços e o '#' inicial, e cria uma lista de tags únicas
    const tags = new Set(allBooks.flatMap(livro => livro.tags.map(tag => tag.trim().replace('#', ''))));

    // Adiciona o botão "Todos"
    container.innerHTML = '<button class="tag-button active" onclick="filtrarPorTag(\'Todos\')">Todos</button>';

    // Cria um botão para cada tag única
    tags.forEach(tag => {
        if (tag) { // Garante que tags vazias não criem botões
            const button = `<button class="tag-button" onclick="filtrarPorTag('${tag}')">${tag}</button>`;
            container.innerHTML += button;
        }
    });
}

function filtrarPorTag(tag) {
    // Atualiza a classe 'active' nos botões
    const buttons = document.querySelectorAll('.tag-button');
    buttons.forEach(button => {
        button.classList.toggle('active', button.innerText === tag);
    });

    // Aplica os filtros combinados
    aplicarFiltros();
}

function aplicarFiltros() {
    const termoBusca = document.getElementById('campo-busca').value.toLowerCase();
    const tagAtivaElement = document.querySelector('.tag-button.active');
    const tagAtiva = tagAtivaElement ? tagAtivaElement.innerText : 'Todos';

    let livrosFiltrados = allBooks;

    // 1. Filtra pela tag ativa (se não for "Todos")
    if (tagAtiva !== 'Todos') {
        livrosFiltrados = livrosFiltrados.filter(livro =>
            livro.tags.some(t => t.trim().replace('#', '') === tagAtiva)
        );
    }

    // 2. Filtra pelo termo de busca sobre o resultado anterior
    livrosFiltrados = livrosFiltrados.filter(livro => livro.nome.toLowerCase().includes(termoBusca));

    renderBooks(livrosFiltrados);
}