// 주소 검색창에서 선택한 결과
export interface PostcodeAddress {
    zonecode: string;
    userSelectedType: 'R' | 'J';
    roadAddress: string;
    jibunAddress: string;
    bname: string;
    buildingName: string;
    apartment: 'Y' | 'N';
}

// 외부 스크립트가 window에 제공하는 우편번호 검색 기능
declare global {
    interface Window {
        kakao?: {
            Postcode: new (options: {
                oncomplete: (data: PostcodeAddress) => void;
            }) => {
                open: () => void;
            };
        };
    }
}