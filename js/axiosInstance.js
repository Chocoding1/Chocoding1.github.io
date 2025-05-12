// axiosInstance.js

const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080/api/',
    withCredentials: true, // 쿠키 자동 포함
});

// 요청 인터셉터: 요청 보내기 전에 accessToken을 헤더에 추가
axiosInstance.interceptors.request.use(
    config => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// 응답 인터셉터: 응답을 받았을 때 처리
axiosInstance.interceptors.response.use(
    response => {
        // 정상 응답은 그대로 리턴
        return response;
    },
    async error => {
        const originalRequest = error.config;

        // 401 에러 + 아직 재시도 안한 경우만 처리
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // 재시도 표시
            alert('axios interceptor : AT 만료');

            try {
                // localStorage에서 RT 추출
                const refreshToken = localStorage.getItem('refreshToken');

                // /reissue 요청해서 새로운 accessToken 발급
                const reissueResponse = await axios.post('http://localhost:8080/api/reissue', {}, {headers: {'Authorization-Refresh': refreshToken}});

                const newAccessToken = reissueResponse.headers['authorization'].replace("Bearer ", "");
                localStorage.setItem('accessToken', newAccessToken);

                const newRefreshToken = reissueResponse.headers['authorization-refresh'];
                localStorage.setItem('refreshToken', newRefreshToken);

                // 새 토큰으로 원래 요청 재전송
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return axiosInstance(originalRequest);

            } catch (reissueError) {
                // 재발급 실패하면 (ex: refreshToken 만료)
                console.error("토큰 재발급 실패", reissueError);
                alert('토큰 재발급 실패');
                location.href = '/pages/member/loginMemberForm.html'; // 로그인 페이지로 이동
                return Promise.reject(reissueError);
            }
        }

        // 다른 에러는 그냥 넘김
        return Promise.reject(error);
    }
);

// 전역 변수로 등록
window.axiosInstance = axiosInstance;
