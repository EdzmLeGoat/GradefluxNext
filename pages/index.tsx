export default function Index() {
  return null;
}

export const getServerSideProps = async () => {
  return {
    redirect: {
      destination: "/home",
      permanent: false,
    },
  };
};
