document.addEventListener('DOMContentLoaded', () => {
    const livrosContainer = document.getElementById('livros-container');
    const filtrosContainer = document.getElementById('filtros-container');
    const campoBusca = document.getElementById('campo-busca');
    const botaoBusca = document.getElementById('botao-busca');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');

    let livros = [];
    let swiper;
    let filtrosAtivos = new Set();

    // Carrega os dados dos livros do JSON
    async function carregarLivros() {
        try {
            const response = await fetch('data.json');
            livros = await response.json();
            livros.forEach(livro => {
                livro.tags = livro.tags.map(tag => tag.trim().replace('#', ''));
            });
            exibirLivros(livros);
            criarBotoesFiltro(livros);
        } catch (error) {
            console.error('Erro ao carregar os livros:', error);
        }
    }

    // Exibe os livros no carrossel Swiper
    function exibirLivros(livrosParaExibir, termoBusca = '') {
        livrosContainer.innerHTML = '';

        // Função auxiliar para destacar o texto
        const highlightText = (text, highlight) => {
            if (!highlight.trim()) {
                return text;
            }
            // Cria uma expressão regular segura para encontrar o termo de busca,
            // de forma global (g) e insensível a maiúsculas/minúsculas (i).
            const regex = new RegExp(`(${highlight})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        // Se não houver livros, exibe a mensagem e para a execução.
        if (livrosParaExibir.length === 0) {
            livrosContainer.innerHTML = '<p class="nenhum-resultado">Nenhum livro encontrado com os filtros selecionados.</p>';
            if (swiper) {
                swiper.destroy(true, true);
                swiper = undefined;
            }
            return;
        }

        livrosParaExibir.forEach(livro => {
            // Aplica o destaque no nome, descrição e tags
            const nomeDestacado = highlightText(livro.nome, termoBusca);
            const descricaoDestacada = highlightText(livro.descricao, termoBusca);
            const tagsDestacadas = highlightText(livro.tags.join(', '), termoBusca);

            const card = `
                <div class="swiper-slide">
                    <article class="card">
                        <h2>${nomeDestacado}</h2>
                        <p class="ano-publicacao">${livro.data_lancamento}</p>
                        <p>${descricaoDestacada}</p>
                        <div class="tags">${tagsDestacadas}</div>
                        <a href="${livro.link}" target="_blank">Saiba mais</a>
                    </article>
                </div>
            `;
            livrosContainer.innerHTML += card;
        });
        inicializarSwiper(livrosParaExibir.length);
    }

    // Inicializa ou atualiza a instância do Swiper
    function inicializarSwiper(numLivros) {
        if (swiper) {
            swiper.destroy(true, true);
        }
        swiper = new Swiper('.swiper-container', {
            loop: numLivros > 3,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                320: { slidesPerView: 1, spaceBetween: 20 },
                768: { slidesPerView: 2, spaceBetween: 30 },
                1024: { slidesPerView: 3, spaceBetween: 30 }
            }
        });
    }

    // Cria os botões de gênero dinamicamente
    function criarBotoesFiltro(livros) {
        // Limpa os botões antigos para evitar duplicação ao recarregar
        filtrosContainer.innerHTML = '';
        filtrosContainer.appendChild(limparFiltrosBtn);

        const tagCounts = {};
        livros.forEach(livro => {
            livro.tags.forEach(tag => {
                if (tag) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
            });
        });

        // Ordena as tags pela contagem (mais populares primeiro)
        const tagsOrdenadas = Object.keys(tagCounts).sort((a, b) => {
            const diff = tagCounts[b] - tagCounts[a];
            if (diff === 0) {
                return a.localeCompare(b); // desempate alfabético
            }
            return diff;
        });

        const MAX_TAGS_VISIVEIS = 10;

        tagsOrdenadas.forEach(tag => {
            const botao = document.createElement('button');
            botao.className = 'filtro-tag';
            botao.textContent = `${tag} (${tagCounts[tag]})`; // Adiciona o contador
            botao.dataset.tag = tag;
            botao.addEventListener('click', () => toggleFiltro(tag, botao));

            // Adiciona a classe para esconder se exceder o limite
            if (tagsOrdenadas.indexOf(tag) >= MAX_TAGS_VISIVEIS) {
                botao.classList.add('filtro-tag-escondido');
            }

            filtrosContainer.insertBefore(botao, limparFiltrosBtn);
        });

        // Adiciona o botão "Ver mais" se houver tags escondidas
        if (tagsOrdenadas.length > MAX_TAGS_VISIVEIS) {
            const verMaisBtn = document.createElement('button');
            verMaisBtn.id = 'ver-mais-tags';
            verMaisBtn.className = 'filtro-tag-ver-mais';
            verMaisBtn.textContent = 'Ver mais';
            verMaisBtn.addEventListener('click', toggleTagsEscondidas);
            filtrosContainer.appendChild(verMaisBtn);
        }
    }

    // Adiciona ou remove um filtro da lista de ativos
    function toggleFiltro(tag, botao) {
        botao.classList.toggle('ativo');
        if (filtrosAtivos.has(tag)) {
            filtrosAtivos.delete(tag);
        } else {
            filtrosAtivos.add(tag);
        }
        
        limparFiltrosBtn.style.display = filtrosAtivos.size > 0 ? 'inline-block' : 'none';
        aplicarFiltros();
    }

    // Mostra ou esconde as tags menos populares
    function toggleTagsEscondidas() {
        const tagsEscondidas = document.querySelectorAll('.filtro-tag-escondido');
        const botao = document.getElementById('ver-mais-tags');
        const estaoVisiveis = botao.textContent === 'Ver menos';

        tagsEscondidas.forEach(tag => {
            tag.style.display = estaoVisiveis ? 'none' : 'inline-block';
        });

        botao.textContent = estaoVisiveis ? 'Ver mais' : 'Ver menos';
    }

    // Limpa todos os filtros ativos
    function limparFiltros() {
        filtrosAtivos.clear();
        document.querySelectorAll('.filtro-tag.ativo').forEach(btn => {
            btn.classList.remove('ativo');
        });
        limparFiltrosBtn.style.display = 'none';

        // Limpa também o campo de busca por texto
        campoBusca.value = '';

        // Garante que os contadores e botões sejam recriados com os valores originais
        criarBotoesFiltro(livros);
        aplicarFiltros();

        aplicarFiltros();
    }

    // Aplica os filtros de gênero e a busca por texto
    function aplicarFiltros() {
        const termoBusca = campoBusca.value.toLowerCase();
        let livrosFiltradosPorBusca = livros;

        // 1. Filtra primeiro pelo termo de busca
        if (termoBusca) {
            livrosFiltradosPorBusca = livros.filter(livro => {
                const nome = livro.nome.toLowerCase();
                const descricao = livro.descricao.toLowerCase();
                const tags = livro.tags.join(' ').toLowerCase(); // Junta as tags em uma única string
                return nome.includes(termoBusca) || descricao.includes(termoBusca) || tags.includes(termoBusca);
            });
        }

        // 2. Atualiza os contadores dos botões de gênero com base nos resultados da busca
        atualizarContadoresDeTag(livrosFiltradosPorBusca);

        // 3. Aplica os filtros de gênero (tags) sobre a lista já filtrada pela busca
        let livrosFiltradosFinais = livrosFiltradosPorBusca;
        if (filtrosAtivos.size > 0) {
            livrosFiltradosFinais = livrosFiltradosPorBusca.filter(livro => {
                return [...filtrosAtivos].some(filtro => livro.tags.includes(filtro));
            });
        }

        // 4. Exibe o resultado final
        exibirLivros(livrosFiltradosFinais, termoBusca);
    }

    // Adiciona os "escutadores" de eventos
    botaoBusca.addEventListener('click', aplicarFiltros);
    campoBusca.addEventListener('input', aplicarFiltros); // Busca em tempo real
    limparFiltrosBtn.addEventListener('click', limparFiltros);

    // Inicia a aplicação
    carregarLivros();
});