import { KeyRound, ShieldCheck, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TelaInterna } from '../../../../components/TelaInterna';
import { Botao, Cartao } from '../../../../components/ui';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSync } from '../../../../contexts/SyncContext';
import { requisitar } from '../../../../services/api';
import { authService } from '../../../../services/authService';
import { cores, espacamento, fonte, raio } from '../../../../theme';

/**
 * Troca de senha.
 *
 * Diferente do resto do app, esta operação exige conexão: a senha é validada e
 * regravada no servidor, e guardá-la numa fila offline manteria a credencial
 * antiga válida no aparelho por tempo indeterminado.
 */
export default function Seguranca() {
  const { usuario, obterTokenValido } = useAuth();
  const { online } = useSync();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = async () => {
    if (!usuario) return;

    if (!senhaAtual || !novaSenha) {
      setMensagem({ tipo: 'erro', texto: 'Preencha a senha atual e a nova senha.' });
      return;
    }
    if (novaSenha.length < 6) {
      setMensagem({ tipo: 'erro', texto: 'A nova senha deve ter ao menos 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmacao) {
      setMensagem({ tipo: 'erro', texto: 'A confirmação não corresponde à nova senha.' });
      return;
    }

    setEnviando(true);
    setMensagem(null);
    try {
      const token = await obterTokenValido();
      if (!token) {
        setMensagem({ tipo: 'erro', texto: 'Sem conexão com o servidor. Tente novamente online.' });
        return;
      }

      await requisitar(`/usuarios/${usuario.idUsuario}`, {
        metodo: 'PUT',
        token,
        corpo: {
          nomeUsuario: usuario.nomeUsuario,
          email: usuario.email,
          funcao: usuario.funcao,
          ativo: usuario.ativo,
          senhaAtual,
          senha: novaSenha,
        },
      });

      // Mantém o login offline funcionando com a credencial nova.
      await authService.atualizarSenhaGuardada(usuario.email, novaSenha);

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacao('');
      setMensagem({ tipo: 'ok', texto: 'Senha alterada com sucesso.' });
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro instanceof Error ? erro.message : 'Não foi possível alterar a senha.',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <TelaInterna titulo="Segurança" subtitulo="Gerencie o acesso à sua conta.">
      {!online && (
        <Cartao style={estilos.avisoOffline}>
          <WifiOff size={18} color="#B45309" />
          <Text style={estilos.avisoTexto}>
            A troca de senha precisa de conexão com o servidor. Conecte-se para continuar.
          </Text>
        </Cartao>
      )}

      <Cartao style={estilos.bloco}>
        <View style={estilos.cabecalhoBloco}>
          <KeyRound size={18} color={cores.verde} />
          <Text style={estilos.tituloBloco}>Alterar senha</Text>
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Senha atual</Text>
          <TextInput
            style={estilos.input}
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            secureTextEntry
            autoCapitalize="none"
            editable={online && !enviando}
            placeholder="••••••••"
            placeholderTextColor={cores.textoFraco}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Nova senha</Text>
          <TextInput
            style={estilos.input}
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry
            autoCapitalize="none"
            editable={online && !enviando}
            placeholder="Mínimo de 6 caracteres"
            placeholderTextColor={cores.textoFraco}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.rotulo}>Confirmar nova senha</Text>
          <TextInput
            style={estilos.input}
            value={confirmacao}
            onChangeText={setConfirmacao}
            secureTextEntry
            autoCapitalize="none"
            editable={online && !enviando}
            placeholder="Repita a nova senha"
            placeholderTextColor={cores.textoFraco}
          />
        </View>

        {mensagem && (
          <Text
            style={[
              estilos.mensagem,
              { color: mensagem.tipo === 'erro' ? cores.vermelho : cores.verde },
            ]}
          >
            {mensagem.texto}
          </Text>
        )}

        <Botao
          titulo={enviando ? 'Alterando…' : 'Alterar senha'}
          aoPressionar={() => void alterar()}
          desabilitado={!online || enviando}
        />
      </Cartao>

      <Cartao style={estilos.bloco}>
        <View style={estilos.cabecalhoBloco}>
          <ShieldCheck size={18} color={cores.verde} />
          <Text style={estilos.tituloBloco}>Acesso offline</Text>
        </View>
        <Text style={estilos.explicacao}>
          Suas credenciais ficam guardadas de forma criptografada neste aparelho para que você
          continue trabalhando sem sinal. Ao encerrar a sessão, elas são apagadas junto com os dados
          baixados.
        </Text>
      </Cartao>
    </TelaInterna>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espacamento.sm,
  },
  cabecalhoBloco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    marginBottom: espacamento.xs,
  },
  tituloBloco: {
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
  },
  campo: {
    gap: 4,
  },
  rotulo: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espacamento.md,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.cartaoAlt,
  },
  mensagem: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
  },
  avisoOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    backgroundColor: cores.ambarFundo,
    borderColor: '#FDE68A',
  },
  avisoTexto: {
    flex: 1,
    fontSize: fonte.pequeno,
    color: '#B45309',
  },
  explicacao: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    lineHeight: 19,
  },
});
