import InputBox from "../components/input.component";
import { useContext, useRef } from "react";
import { UserContext } from "../App";
import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";

const ChangePassword = () => {
  let {
    userAuth: { access_token },
  } = useContext(UserContext);
  let changePasswordForm = useRef();

  let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

  const handleSubmit = (e) => {
    e.preventDefault();

    let form = new FormData(changePasswordForm.current);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    let { currentPassword, newPassword } = formData;

    if (!currentPassword.length || !newPassword.length) {
      return toast.error("Preencha todos os campos");
    }
    if (
      !passwordRegex.test(currentPassword) ||
      !passwordRegex.test(newPassword)
    ) {
      return toast.error(
        "A senha deve ter entre 6 a 20 caracteres, contendo 1 número, 1 letra minúscula e 1 letra maiúscula"
      );
    }

    // enviando senha para o servidor
    e.target.setAttribute("disabled", true);

    let loadingToast = toast.loading("Atualizando...");

    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/change-password", formData, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then(() => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        return toast.success("Senha atualizada");
      })
      .catch(({ response }) => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        return toast.error(response.data.error);
      });
  };

  return (
    <AnimationWrapper>
      <Toaster />
      <form ref={changePasswordForm}>
        <h1 className="max-md:hidden font-bold">Trocar senha</h1>

        <div className="py-10 w-full md:max-w-[400px]">
          <InputBox
            name="currentPassword"
            type="password"
            className="profile-edit-input"
            placeholder="Senha atual"
            icon="fi-rr-unlock"
          />
          <InputBox
            name="newPassword"
            type="password"
            className="profile-edit-input"
            placeholder="Nova senha"
            icon="fi-rr-unlock"
          />

          <button
            className="btn-dark px-10"
            type="submit"
            onClick={handleSubmit}
          >
            Trocar senha
          </button>
        </div>
      </form>
    </AnimationWrapper>
  );
};

export default ChangePassword;
