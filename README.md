# Arsenal-Soma Code Generator

Uma extensão do Visual Studio Code que gera código React baseado no design system Soma e framework Arsenal.

## Funcionalidades

- Geração de componentes React com TypeScript
- Integração com OpenAI para geração inteligente de código
- Interface de chat intuitiva
- Suporte a templates personalizados
- Geração de testes unitários
- Documentação automática

## Requisitos

- Visual Studio Code 1.60.0 ou superior
- Node.js 14.x ou superior
- API Key da OpenAI

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/arsenal-soma-code-generator.git
```

2. Instale as dependências:
```bash
npm install
```

3. Compile o projeto:
```bash
npm run compile
```

4. Pressione F5 no VSCode para iniciar a extensão em modo de desenvolvimento

## Configuração

1. Abra as configurações do VSCode (Ctrl+,)
2. Procure por "Arsenal-Soma"
3. Configure sua API Key da OpenAI

## Uso

1. Abra o painel do chat clicando no ícone do Arsenal-Soma na barra de atividades
2. Digite sua solicitação de geração de código
3. Aguarde a geração do componente
4. Os arquivos serão criados automaticamente no seu projeto

## Exemplos

Para gerar um componente de login:
```
gere uma página de login com usuário e senha com uma service que se integre a uma api pra validar o login e setar o local storage com o usuário autenticado
```

## Desenvolvimento

- `npm run compile` - Compila o projeto
- `npm run watch` - Compila o projeto em modo watch
- `npm run lint` - Executa o linter

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
